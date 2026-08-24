import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
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
  private readonly localService = inject(LocalService);
  private readonly publicoService = inject(LocalPublicoService);

  readonly etapaAtual = signal<Etapa>(0);
  readonly idLocal = signal<number | null>(null);
  readonly statusExibicao = signal<StatusExibicao | null>(null);
  readonly statusLabel = STATUS_EXIBICAO_LABEL;
  readonly carregando = signal(false);
  readonly naoEncontrado = signal(false);

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
    if (this.etapasHabilitadas()[etapa]) {
      this.etapaAtual.set(etapa);
    }
  }

  onSalvarDados(payload: LocalDadosPayload): void {
    const id = this.idLocal();
    const salvo$ = id ? this.localService.updateLocal(id, payload) : this.localService.createLocal(payload);

    salvo$.subscribe((resumo) => {
      if (!resumo) return;
      this.idLocal.set(resumo.id);
      this.statusExibicao.set(resumo.statusExibicao);
      this.etapasHabilitadas.set([true, true, true]);
    });
  }

  onSalvarDemografia(payload: LocalPublicoPayload): void {
    const id = this.idLocal();
    if (!id) return;
    this.publicoService.savePublico(id, payload).subscribe();
  }
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
