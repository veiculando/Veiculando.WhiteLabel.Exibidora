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
import { AurumStatusPillComponent, AurumStatusPillTom } from '../../../shared/aurum/aurum-status-pill.component';
import { AurumModalComponent } from '../../../shared/aurum/aurum-modal.component';
import { RouterLink } from '@angular/router';

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
    AurumButtonComponent,
    AurumCardComponent,
    AurumCheckboxComponent,
    AurumHistoryCardComponent,
    AurumStatusPillComponent,
    AurumModalComponent,
    RouterLink,
  ],
  templateUrl: './kyc-detalhe.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .kyc-detalhe__voltar { display: inline-block; margin-bottom: 16px; color: var(--primary-color); font-size: 0.8125rem; font-weight: 600; text-decoration: none; }
      .kyc-detalhe__cabecalho { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding: 20px 24px; background: var(--white); border: 1px solid var(--line-subtle); border-radius: 18px; box-shadow: var(--shadow-card); }
      .kyc-detalhe__selo { display: grid; place-items: center; flex: none; width: 52px; height: 52px; border-radius: 14px; background: var(--wine-grad); color: var(--gold-light); box-shadow: 0 6px 12px rgba(138, 0, 9, 0.25); }
      .kyc-detalhe__selo .aurum-ico { width: 24px; height: 24px; }
      .kyc-detalhe__titulo { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
      .kyc-detalhe__titulo h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
      .kyc-detalhe__cabecalho p { margin: 4px 0 0; font-size: 0.8125rem; color: var(--on-surface); }
      .kyc-detalhe__abas { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
      .kyc-detalhe__aba { padding: 8px 16px; border: 1px solid var(--line-search); border-radius: var(--radius-pill); background: var(--white); color: var(--charcoal); font: inherit; font-size: 0.78125rem; font-weight: 600; cursor: pointer; }
      .kyc-detalhe__aba[aria-selected='true'] { border-color: var(--primary-color); background: var(--primary-color); color: var(--white); }
      .kyc-detalhe__conteudo { border-radius: 18px; }
      .kyc-detalhe__conteudo h2 { margin: 0 0 16px; font-size: 1.0625rem; font-weight: 700; }
      .kyc-detalhe__campos { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
      .kyc-detalhe__campo { display: flex; flex-direction: column; gap: 4px; font-size: 0.8125rem; color: var(--charcoal); }
      .kyc-detalhe__rotulo { font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: var(--on-surface); }
      .kyc-detalhe__lacuna { margin: 0; padding: 12px 16px; border: 1px solid var(--warning-border); border-radius: 10px; background: var(--warning-bg); font-size: 0.8125rem; color: var(--warning); }
      .kyc-detalhe__doc { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line-search); font-size: 0.8125rem; }
      .kyc-detalhe__doc:last-child { border-bottom: none; }
      .kyc-detalhe__barra { position: sticky; bottom: 0; z-index: 15; margin: 20px -40px -40px; display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 14px 40px; background: var(--white); box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08); }
      @media (max-width: 900px) { .kyc-detalhe__barra { margin: 20px -16px -16px; padding: 12px 16px; flex-wrap: wrap; } }
      .kyc-detalhe__barra-texto { margin-right: auto; font-size: 0.78125rem; color: var(--on-surface); }
      .kyc-detalhe__decisao { display: flex; flex-direction: column; gap: 14px; }
      .kyc-detalhe__aviso { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; border-radius: 12px; font-size: 0.8125rem; }
      .kyc-detalhe__aviso--sucesso { border: 1px solid var(--success-border); background: var(--success-bg); color: var(--success); }
      .kyc-detalhe__aviso--perigo { border: 1px solid var(--danger-border); background: var(--danger-bg); color: var(--danger); }
      .kyc-detalhe__aviso span { color: var(--charcoal); }
      .kyc-detalhe__dica { margin: 0; font-size: 0.8125rem; color: var(--on-surface); }
      .kyc-detalhe__pendencias { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .kyc-detalhe__pendencia { flex-direction: row !important; align-items: center; gap: 8px !important; font-weight: 500 !important; color: var(--charcoal) !important; }
      .kyc-detalhe__erro { color: var(--danger); }
      .kyc-detalhe__vazio { margin: 0; padding: 8px 0; color: var(--on-surface); font-size: 0.8125rem; }
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
  /** Títulos dos modais do Figma: Aprovar (419:23295), Ajustes (419:22112), Reprovar (419:22721). */
  tituloDecisao(): string {
    return ({ aprovar: 'Aprovar cadastro KYC', ajustes: 'Solicitar ajustes', rejeitar: 'Reprovar cadastro KYC', suspender: 'Suspender organização', reativar: 'Reativar organização' } as Record<string, string>)[this.decisaoAberta ?? ''] ?? '';
  }

  subtituloDecisao(): string {
    return ({ aprovar: 'Confirme a aprovação desta organização.', ajustes: 'Indique o que o solicitante precisa corrigir.', rejeitar: 'Informe o motivo da reprovação.', suspender: 'O acesso da organização fica bloqueado até a reativação.', reativar: 'A organização volta a ter acesso ao App.' } as Record<string, string>)[this.decisaoAberta ?? ''] ?? '';
  }

  rotuloConfirmar(): string {
    return ({ aprovar: 'Confirmar aprovação', ajustes: 'Solicitar ajustes', rejeitar: 'Confirmar reprovação', suspender: 'Confirmar suspensão', reativar: 'Confirmar reativação' } as Record<string, string>)[this.decisaoAberta ?? ''] ?? 'Enviar decisão';
  }

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
