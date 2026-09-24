import { CommonModule, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
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
import { LocalPublicoPayload } from '../models/local-publico.model';
import { STATUS_EXIBICAO_LABEL, StatusExibicao } from '../models/status-exibicao.enum';
import { AurumButtonComponent } from '../../../shared/aurum/aurum-button.component';
import { AurumStatusPillComponent, AurumStatusPillTom } from '../../../shared/aurum/aurum-status-pill.component';
import { PermissionService } from '../../../core/auth/permission.service';
import { BrandingService } from '../../../core/branding/branding.service';

type Etapa = 0 | 1 | 2;

/**
 * Wizard de Local: Dados do Local → Dados Demográficos → Peças (T5 do
 * plano tático).
 *
 * Na criação, só a etapa 1 fica habilitada — as demais dependem de um
 * Id real (ADR-WL-004: o local nasce AprovacaoPendente ao salvar a
 * etapa 1; não há como anexar peça/demografia antes disso). Cada etapa
 * usa seu próprio serviço/payload para nunca sobrescrever a outra.
 *
 * Visual do Figma `419:21489` / `419:24510` (cartão com stepper numerado).
 * Os rótulos das etapas seguem o PRD §5.2, não o frame — o fluxo real é
 * Dados → Demografia → Peças, sem etapa de revisão.
 */
@Component({
  selector: 'app-local-wizard',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [
    CommonModule,
    LocalDadosStepComponent,
    LocalDemografiaStepComponent,
    LocalPecasStepComponent,
    AurumButtonComponent,
    AurumStatusPillComponent,
  ],
  templateUrl: './local-wizard.component.html',
  styles: [
    `
      .local-wizard {
        max-width: 720px;
        margin: 0 auto;
        padding: 28px;
        background: var(--white);
        border-radius: var(--radius-modal);
        filter: drop-shadow(0 16px 24px rgba(74, 14, 14, 0.18));
      }
      .local-wizard__cabecalho p {
        margin: 4px 0 0;
        font-size: 0.78125rem;
        color: var(--on-surface);
      }
      .local-wizard__titulo {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .local-wizard__titulo h1 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        line-height: 30px;
      }
      .local-wizard__abas {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px;
        margin: 16px 0 20px;
        padding: 10px 16px;
        border-radius: 12px;
        background: var(--paper-bg);
      }
      .local-wizard__etapa {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 4px;
        border: none;
        background: transparent;
        color: var(--on-surface);
        font-size: 0.75rem;
        font-weight: 700;
        line-height: 18px;
        cursor: pointer;
      }
      .local-wizard__etapa:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
      .local-wizard__numero {
        display: grid;
        place-items: center;
        width: 21px;
        height: 22px;
        border-radius: 11px;
        background: rgba(0, 0, 0, 0.1);
        color: var(--paper-bg);
        font-size: 0.6875rem;
      }
      .local-wizard__etapa--atual {
        color: var(--primary-color);
      }
      .local-wizard__etapa--atual .local-wizard__numero {
        background: var(--primary-color);
      }
      .local-wizard__seta {
        display: inline-flex;
        color: var(--on-surface);
      }
      .local-wizard .wl-estado {
        margin-bottom: 12px;
      }
    `,
  ],
})
export class LocalWizardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly localService = inject(LocalService);
  private readonly publicoService = inject(LocalPublicoService);

  readonly etapas: { indice: Etapa; rotulo: string }[] = [
    { indice: 0, rotulo: 'Dados do Local' },
    { indice: 1, rotulo: 'Dados Demográficos' },
    { indice: 2, rotulo: 'Peças' },
  ];
  readonly afiliadaId = inject(PermissionService).getAfiliadaId();
  private readonly branding = inject(BrandingService);

  get nomeAfiliada(): string | null {
    return this.branding.branding()?.nomeExibicao ?? null;
  }

  tomStatus(): AurumStatusPillTom {
    const status = this.statusExibicao();
    return status === StatusExibicao.Ativo ? 'sucesso' : status === StatusExibicao.AprovacaoPendente ? 'aviso' : 'neutro';
  }

  readonly etapaAtual = signal<Etapa>(0);
  readonly idLocal = signal<number | null>(null);
  readonly statusExibicao = signal<StatusExibicao | null>(null);
  readonly statusLabel = STATUS_EXIBICAO_LABEL;
  readonly carregando = signal(false);
  readonly naoEncontrado = signal(false);
  readonly erroCarregarLocal = signal('');
  readonly salvando = signal(false);
  readonly mensagem = signal('');
  readonly erroSalvar = signal('');
  readonly carregandoDemografia = signal(false);
  readonly erroCarregarDemografia = signal('');

  dadosIniciais: LocalDadosPayload | null = null;
  demografiaInicial: LocalPublicoPayload | null = null;

  /** [Dados do Local, Dados Demográficos, Peças] */
  etapasHabilitadas = signal<[boolean, boolean, boolean]>([true, false, false]);

  ngOnInit(): void {
    this.carregarLocal();
  }

  carregarLocal(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam || this.carregando()) return; // modo criação: nada a carregar

    const id = Number(idParam);
    this.carregando.set(true);
    this.naoEncontrado.set(false);
    this.erroCarregarLocal.set('');

    this.localService.getLocal(id).subscribe({
      next: (local) => this.aplicarLocalCarregado(id, local),
      error: (err: HttpErrorResponse) => {
        this.carregando.set(false);
        // Somente 404 oculta existência/tenant; rede/5xx devem permitir retry.
        if (err.status === 404) this.naoEncontrado.set(true);
        else this.erroCarregarLocal.set(err.status === 403
          ? 'Você não tem permissão para acessar este local.'
          : 'Não foi possível carregar o local. Tente novamente.');
      },
    });
  }

  private aplicarLocalCarregado(id: number, local: LocalDetalhe): void {
    this.idLocal.set(id);
    this.statusExibicao.set(local.statusExibicao);
    this.dadosIniciais = paraDadosPayload(local);
    this.etapasHabilitadas.set([true, false, true]);
    this.carregando.set(false);
    this.carregarDemografia();
  }

  carregarDemografia(): void {
    const id = this.idLocal();
    if (!id || this.carregandoDemografia()) return;
    this.carregandoDemografia.set(true);
    this.erroCarregarDemografia.set('');
    this.etapasHabilitadas.update(etapas => [etapas[0], false, etapas[2]]);
    this.publicoService.getPublico(id).pipe(
      finalize(() => this.carregandoDemografia.set(false)),
    ).subscribe({
      next: publico => {
        this.demografiaInicial = publico;
        this.etapasHabilitadas.update(etapas => [etapas[0], true, etapas[2]]);
      },
      error: () => this.erroCarregarDemografia.set('Não foi possível carregar os dados demográficos. Tente novamente antes de editar.'),
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
        this.etapasHabilitadas.set([true, this.etapasHabilitadas()[1], true]);
        if (!id) this.carregarDemografia();
        this.mensagem.set('Dados do local salvos e conferidos.');
      }),
      finalize(() => this.salvando.set(false)),
    ).subscribe({
      error: err => this.erroSalvar.set(mensagemErro(err)),
    });
  }

  onSalvarDemografia(payload: LocalPublicoPayload): void {
    const id = this.idLocal();
    if (!id || this.salvando() || !this.etapasHabilitadas()[1]) return;
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
