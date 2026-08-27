import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, switchMap, tap } from 'rxjs';
import { mensagemDeErro } from '../../../core/http/api-error';
import { LocalDadosStepComponent } from './local-dados-step.component';
import { LocalDemografiaStepComponent } from './local-demografia-step.component';
import { LocalPecasStepComponent } from './local-pecas-step.component';
import { LocalService } from '../services/local.service';
import { LocalPublicoService } from '../services/local-publico.service';
import { LocalDadosPayload, LocalDetalhe } from '../models/local.model';
import { LocalPublicoPayload, emptyLocalPublicoPayload } from '../models/local-publico.model';
import { STATUS_EXIBICAO_LABEL, StatusExibicao } from '../models/status-exibicao.enum';

type Etapa = 0 | 1 | 2;

/**
 * Wizard de Local: Dados do Local → Dados Demográficos → Peças (T5 do
 * plano tático).
 *
 * Na criação, só a etapa 1 fica habilitada — as demais dependem de um
 * Id real (ADR-WL-004: o local nasce AprovacaoPendente ao salvar a
 * etapa 1; não há como anexar peça/demografia antes disso). Cada etapa
 * usa seu próprio serviço/payload para nunca sobrescrever a outra.
 */
@Component({
  selector: 'app-local-wizard',
  standalone: true,
  imports: [CommonModule, LocalDadosStepComponent, LocalDemografiaStepComponent, LocalPecasStepComponent],
  templateUrl: './local-wizard.component.html',
})
export class LocalWizardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly localService = inject(LocalService);
  private readonly publicoService = inject(LocalPublicoService);

  readonly etapaAtual = signal<Etapa>(0);
  readonly idLocal = signal<number | null>(null);
  readonly statusExibicao = signal<StatusExibicao | null>(null);
  readonly statusLabel = STATUS_EXIBICAO_LABEL;
  readonly carregando = signal(false);
  readonly naoEncontrado = signal(false);
  readonly salvando = signal(false);
  readonly mensagem = signal('');
  readonly erroSalvar = signal('');

  dadosIniciais: LocalDadosPayload | null = null;
  demografiaInicial: LocalPublicoPayload | null = null;

  /** [Dados do Local, Dados Demográficos, Peças] */
  etapasHabilitadas = signal<[boolean, boolean, boolean]>([true, false, false]);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return; // modo criação: nada a carregar

    const id = Number(idParam);
    this.carregando.set(true);

    this.localService.getLocal(id).subscribe({
      next: (local) => this.aplicarLocalCarregado(id, local),
      error: (err: HttpErrorResponse) => {
        this.carregando.set(false);
        // 404 (IDOR bloqueado no Core) — nunca expõe estado parcial.
        this.naoEncontrado.set(true);
      },
    });
  }

  private aplicarLocalCarregado(id: number, local: LocalDetalhe): void {
    this.idLocal.set(id);
    this.statusExibicao.set(local.statusExibicao);
    this.dadosIniciais = paraDadosPayload(local);
    this.etapasHabilitadas.set([true, true, true]);
    this.carregando.set(false);

    this.publicoService.getPublico(id).subscribe({
      next: (publico) => (this.demografiaInicial = publico),
      error: () => (this.demografiaInicial = emptyLocalPublicoPayload()),
    });
  }

  irParaEtapa(etapa: Etapa): void {
    if (!this.salvando() && this.etapasHabilitadas()[etapa]) {
      this.etapaAtual.set(etapa);
    }
  }

  onSalvarDados(payload: LocalDadosPayload): void {
    if (this.salvando()) return;
    this.salvando.set(true);
    this.erroSalvar.set('');
    this.mensagem.set('');
    const id = this.idLocal();
    const salvo$ = id ? this.localService.updateLocal(id, payload) : this.localService.createLocal(payload);
    salvo$.pipe(
      switchMap(resumo => {
        const salvoId = resumo?.id ?? id;
        if (!salvoId) throw new Error('O servidor não confirmou o cadastro. Confira a listagem antes de tentar novamente.');
        // Guardar o ID antes do GET evita criar outro registro se a conferência falhar.
        this.idLocal.set(salvoId);
        if (!id) this.location.replaceState(`/locais/${salvoId}`);
        return this.localService.getLocal(salvoId);
      }),
      tap(local => {
        if (!dadosConferem(payload, paraDadosPayload(local))) {
          throw new Error('O servidor não confirmou todos os dados informados. Revise o local antes de continuar.');
        }
        this.dadosIniciais = paraDadosPayload(local);
        this.statusExibicao.set(local.statusExibicao);
        this.etapasHabilitadas.set([true, true, true]);
        this.mensagem.set('Dados do local salvos e conferidos.');
      }),
      finalize(() => this.salvando.set(false)),
    ).subscribe({
      error: err => this.erroSalvar.set(mensagemErro(err)),
    });
  }

  onSalvarDemografia(payload: LocalPublicoPayload): void {
    const id = this.idLocal();
    if (!id || this.salvando()) return;
    this.salvando.set(true);
    this.erroSalvar.set('');
    this.mensagem.set('');
    this.publicoService.savePublico(id, payload).pipe(
      switchMap(() => this.publicoService.getPublico(id)),
      tap(publico => {
        if (!dadosConferem(payload, publico)) throw new Error('O servidor não confirmou os dados demográficos. Revise antes de continuar.');
        this.demografiaInicial = publico;
        this.mensagem.set('Dados demográficos salvos e conferidos.');
      }),
      finalize(() => this.salvando.set(false)),
    ).subscribe({ error: err => this.erroSalvar.set(mensagemErro(err)) });
  }
}

function mensagemErro(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 409) return 'O local foi alterado por outra operação. Recarregue antes de tentar novamente.';
    if (err.status === 403) return 'Você não tem permissão para salvar este local.';
    if (err.status === 404) return 'Local não encontrado. Confira a listagem.';
    if (err.status === 400) return mensagemDeErro(err, 'Revise os campos informados. O servidor recusou os dados.');
    return 'Não foi possível confirmar o salvamento. Confira a listagem antes de tentar novamente.';
  }
  return err instanceof Error ? err.message : 'Não foi possível confirmar o salvamento.';
}

/** Compara todo campo editável; normaliza apenas vazio/null, CEP e a precisão SQL das coordenadas. */
function dadosConferem<T extends object>(esperado: T, recebido: T): boolean {
  return (Object.keys(esperado) as (keyof T)[]).every(chave => {
    const a = esperado[chave], b = recebido[chave];
    if (chave === 'cep') return String(a ?? '').replace(/\D/g, '') === String(b ?? '').replace(/\D/g, '');
    if (chave === 'latitude' || chave === 'longitude') return Math.abs(Number(a) - Number(b)) < 0.000001;
    if (Array.isArray(a) && Array.isArray(b)) return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
    return String(a ?? '').trim() === String(b ?? '').trim();
  });
}

/** GET /api/wl/locais/{id} devolve endereço/geolocalização aninhados; o form usa shape flat. */
function paraDadosPayload(local: LocalDetalhe): LocalDadosPayload {
  return {
    idCidade: local.idCidade,
    codigoInterno: local.codigoInterno,
    descricao: local.descricao,
    cep: local.endereco?.cep?.numero ?? null,
    logradouro: local.endereco?.logradouro ?? '',
    numero: local.endereco?.numero ?? null,
    bairro: local.endereco?.bairro ?? null,
    complemento: local.endereco?.complemento ?? null,
    referencia: local.endereco?.referencia ?? null,
    latitude: local.geolocalizacao?.latitude ?? 0,
    longitude: local.geolocalizacao?.longitude ?? 0,
    palavrasChave: local.palavrasChave,
  };
}
