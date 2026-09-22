import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { KycService } from '../../../core/services/comercial.service';
import {
  EstadoOnboarding,
  KycDetalhe,
  KycDocumento,
  TipoOrganizacao,
} from '../../../core/models/comercial.models';
import { AurumButtonComponent } from '../../../shared/aurum/aurum-button.component';
import { AurumCardComponent } from '../../../shared/aurum/aurum-card.component';
import { AurumCheckboxComponent } from '../../../shared/aurum/aurum-checkbox.component';
import {
  AurumHistoryCardComponent,
  AurumHistoryEvento,
} from '../../../shared/aurum/aurum-history-card.component';
import { AurumPageHeaderComponent } from '../../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent, AurumStatusPillTom } from '../../../shared/aurum/aurum-status-pill.component';
import { AurumTextInputComponent } from '../../../shared/aurum/aurum-text-input.component';

type AbaKyc =
  | 'empresa'
  | 'responsavel'
  | 'documentos'
  | 'representacao'
  | 'usuarios'
  | 'comerciais'
  | 'historico';

type Decisao = 'aprovar' | 'ajustes' | 'rejeitar' | 'suspender' | 'reativar';

/**
 * Detalhe e revisão de KYC — VEI-RD-81, rota `/kyc/:id`. Sete abas.
 *
 * **Toda decisão exige justificativa estruturada** antes de o envio habilitar, e
 * `/ajustes` exige também a seleção do que está pendente. A trava aqui é conveniência;
 * a garantia é do servidor, que recusa a chamada direta sem esses campos.
 *
 * **Documentos abrem por URL temporária**, pedida no clique. Guardar o link no
 * componente o faria viver enquanto a aba ficasse aberta — o oposto de temporário.
 */
@Component({
  selector: 'app-kyc-detalhe',
  imports: [
    FormsModule,
    AurumPageHeaderComponent,
    AurumButtonComponent,
    AurumCardComponent,
    AurumCheckboxComponent,
    AurumHistoryCardComponent,
    AurumStatusPillComponent,
    AurumTextInputComponent,
  ],
  templateUrl: './kyc-detalhe.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .kyc-detalhe__abas { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); }
      .kyc-detalhe__aba { background: none; border: none; border-bottom: 2px solid transparent; padding: 10px 14px; cursor: pointer; font: inherit; color: var(--on-surface); }
      .kyc-detalhe__aba[aria-selected='true'] { border-bottom-color: var(--primary-color); font-weight: 600; }
      .kyc-detalhe__campos { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
      .kyc-detalhe__campo { display: flex; flex-direction: column; gap: 2px; }
      .kyc-detalhe__rotulo { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--on-surface); }
      .kyc-detalhe__lacuna { padding: 16px; border-radius: var(--radius-sm); background: color-mix(in srgb, var(--secondary-color) 14%, transparent); }
      .kyc-detalhe__doc { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
      .kyc-detalhe__acoes { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 20px; }
      .kyc-detalhe__decisao { margin-top: 16px; }
      .kyc-detalhe__pendencias { display: flex; flex-direction: column; gap: 4px; margin: 12px 0; }
      .kyc-detalhe__erro { color: var(--erro, #b00020); }
      .kyc-detalhe__vazio { padding: 24px; color: var(--on-surface); }
    `,
  ],
})
export class KycDetalheComponent implements OnInit {
  private serv = inject(KycService);
  private rota = inject(ActivatedRoute);

  detalhe: KycDetalhe | null = null;
  carregando = false;
  erro = '';

  aba: AbaKyc = 'empresa';
  readonly abas: { chave: AbaKyc; rotulo: string }[] = [
    { chave: 'empresa', rotulo: 'Dados da empresa' },
    { chave: 'responsavel', rotulo: 'Responsável legal' },
    { chave: 'documentos', rotulo: 'Documentos' },
    { chave: 'representacao', rotulo: 'Representação' },
    { chave: 'usuarios', rotulo: 'Usuários e convites' },
    { chave: 'comerciais', rotulo: 'Condições comerciais' },
    { chave: 'historico', rotulo: 'Histórico' },
  ];

  decisaoAberta: Decisao | null = null;
  justificativa = '';
  pendencias: Record<string, boolean> = {};

  /** Itens que `/ajustes` pode marcar como pendentes. */
  readonly camposPendentesPossiveis = [
    'Dados da empresa',
    'Responsável legal',
    'Contrato social',
    'Documento de identificação',
    'Procuração',
  ];

  ngOnInit(): void {
    const id = Number(this.rota.snapshot.paramMap.get('id'));
    this.carregar(id);
  }

  carregar(id: number): void {
    this.carregando = true;
    this.serv.detalhe(id).subscribe({
      next: (detalhe) => {
        this.detalhe = detalhe;
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Não foi possível carregar a análise.';
        this.carregando = false;
      },
    });
  }

  selecionarAba(aba: AbaKyc): void {
    this.aba = aba;
  }

  rotuloTipo(tipo: TipoOrganizacao): string {
    return tipo === TipoOrganizacao.Agencia ? 'Agência' : 'Anunciante';
  }

  /** Aba 4 muda de nome conforme o tipo: uma Agência tem anunciantes, e vice-versa. */
  rotuloRepresentacao(): string {
    if (!this.detalhe) return 'Representação';
    return this.detalhe.Tipo === TipoOrganizacao.Agencia ? 'Anunciantes vinculados' : 'Agências e representação';
  }

  rotuloEstado(estado: EstadoOnboarding): string {
    const nomes: Record<number, string> = {
      [EstadoOnboarding.Rascunho]: 'Rascunho',
      [EstadoOnboarding.PendenteVerificacao]: 'Pendente',
      [EstadoOnboarding.EmAnalise]: 'Em análise',
      [EstadoOnboarding.AjustesSolicitados]: 'Ajustes solicitados',
      [EstadoOnboarding.Aprovado]: 'Aprovado',
      [EstadoOnboarding.Rejeitado]: 'Rejeitado',
      [EstadoOnboarding.Suspenso]: 'Suspenso',
    };
    return nomes[estado] ?? 'Desconhecido';
  }

  tomEstado(estado: EstadoOnboarding): AurumStatusPillTom {
    switch (estado) {
      case EstadoOnboarding.Aprovado:
        return 'sucesso';
      case EstadoOnboarding.Rejeitado:
      case EstadoOnboarding.Suspenso:
        return 'perigo';
      case EstadoOnboarding.AjustesSolicitados:
        return 'aviso';
      case EstadoOnboarding.EmAnalise:
        return 'primario';
      default:
        return 'neutro';
    }
  }

  rotuloTipoDocumento(tipo: number): string {
    return ['Contrato social', 'Identificação', 'Procuração'][tipo] ?? 'Documento';
  }

  rotuloStatusDocumento(status: number): string {
    return ['Pendente', 'Aprovado', 'Rejeitado'][status] ?? 'Pendente';
  }

  /** Abre o documento por URL temporária, emitida agora. */
  abrirDocumento(documento: KycDocumento): void {
    this.serv.urlDocumento(documento.Id).subscribe({
      next: (link) => window.open(link.Url, '_blank', 'noopener'),
      error: () => (this.erro = 'Não foi possível abrir o documento.'),
    });
  }

  /** Histórico usa o primitive do plano 1 — evento + timestamp + autor. */
  eventosHistorico(): AurumHistoryEvento[] {
    if (!this.detalhe) return [];
    // A ordem vem do servidor e não é reordenada aqui: o append-only é garantia do
    // backend, e reordenar no cliente esconderia uma eventual quebra dela.
    return this.detalhe.Historico.map((decisao) => ({
      evento: decisao.Justificativa
        ? `${this.rotuloEstado(decisao.Estado)} — ${decisao.Justificativa}`
        : this.rotuloEstado(decisao.Estado),
      timestamp: new Date(decisao.DataHora).toLocaleString('pt-BR'),
      autor: decisao.Usuario ?? '—',
    }));
  }

  /** Formata sem DatePipe: o componente ja formata datas em TS, e importar
   *  CommonModule so por um pipe traria o resto junto. */
  expiracao(data: string): string {
    return new Date(data).toLocaleDateString('pt-BR');
  }

  abrirDecisao(decisao: Decisao): void {
    this.decisaoAberta = decisao;
    this.justificativa = '';
    this.pendencias = {};
  }

  alternarPendencia(campo: string, marcado: boolean): void {
    this.pendencias = { ...this.pendencias, [campo]: marcado };
  }

  camposPendentesSelecionados(): string[] {
    return Object.keys(this.pendencias).filter((campo) => this.pendencias[campo]);
  }

  /**
   * Habilita o envio. Reativar é o único caso sem justificativa obrigatória — é o
   * desfazer de uma suspensão já justificada, não uma decisão nova sobre o mérito.
   */
  podeEnviar(): boolean {
    if (!this.decisaoAberta) return false;
    if (this.decisaoAberta === 'reativar') return true;
    if (!this.justificativa.trim()) return false;
    if (this.decisaoAberta === 'ajustes') return this.camposPendentesSelecionados().length > 0;
    return true;
  }

  enviarDecisao(): void {
    if (!this.detalhe || !this.decisaoAberta || !this.podeEnviar()) return;

    const id = this.detalhe.Id;
    const corpo = {
      Justificativa: this.justificativa,
      CamposPendentes: this.decisaoAberta === 'ajustes' ? this.camposPendentesSelecionados() : undefined,
    };

    const chamadas = {
      aprovar: () => this.serv.aprovar(id, corpo),
      ajustes: () => this.serv.ajustes(id, corpo),
      rejeitar: () => this.serv.rejeitar(id, corpo),
      suspender: () => this.serv.suspender(id, corpo),
      reativar: () => this.serv.reativar(id, corpo),
    };

    chamadas[this.decisaoAberta]().subscribe({
      next: () => {
        this.decisaoAberta = null;
        this.carregar(id);
      },
      error: (resposta) => {
        this.erro = resposta?.error?.message ?? 'Não foi possível registrar a decisão.';
      },
    });
  }

  /** Suspender só existe para organização aprovada; reativar, só para suspensa. */
  podeSuspender(): boolean {
    return this.detalhe?.Estado === EstadoOnboarding.Aprovado;
  }

  podeReativar(): boolean {
    return this.detalhe?.Estado === EstadoOnboarding.Suspenso;
  }
}
