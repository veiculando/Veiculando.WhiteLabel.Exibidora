import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { mensagemDeErro } from '../../core/http/api-error';
import {
  DashboardFinanceiroKpis,
  DashboardKpis,
  DashboardPedidoInsercaoItem,
  DashboardReservaItem,
  PeriodoLookup,
  TOM_STATUS_PEDIDO_INSERCAO,
} from '../../core/models/wl.models';
import { DashboardService } from '../../core/services/dashboard.service';
import { LookupsService } from '../../core/services/lookups.service';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumCardComponent } from '../../shared/aurum/aurum-card.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumStatCardComponent } from '../../shared/aurum/aurum-stat-card.component';
import { AurumStatusPillComponent, AurumStatusPillTom } from '../../shared/aurum/aurum-status-pill.component';

/**
 * Dashboard operacional + painel financeiro (VEI-RD-85) — Figma `153:1265`.
 *
 * A ordem segue o Figma: cartão do período, os 4 KPIs e as duas listas.
 * A seção "Visão operacional" (Locais ativos / Peças em exibição / Pedidos
 * pendentes / alerta de aprovação pendente) é a tela pré-existente, sem
 * escopo de período e sem equivalente no frame — fica abaixo, com o mesmo
 * cartão de indicador.
 *
 * O botão "Testar Erro" do Figma é instrumentação de desenvolvimento
 * (plano tático, seção 5) — não implementado aqui, de propósito.
 */
/** Status oficiais da reserva (PRD §5.8) nos tons do Figma: pendente âmbar, aprovada verde. */
const TOM_STATUS_RESERVA: Record<string, AurumStatusPillTom> = {
  Solicitado: 'aviso',
  Revisado: 'info',
  Confirmado: 'sucesso',
  'Itens Indisponíveis': 'perigo',
  Cancelado: 'perigo',
};

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AurumPageHeaderComponent,
    AurumCardComponent,
    AurumButtonComponent,
    AurumStatusPillComponent,
    AurumStatCardComponent,
  ],
  templateUrl: './dashboard.component.html',
  styles: [
    `
      .periodo {
        display: grid;
        gap: 4px;
        margin-bottom: 20px;
        padding: 24px;
        background: var(--white);
        border: 1px solid var(--line-subtle);
        border-radius: 18px;
        filter: drop-shadow(0 8px 16px rgba(74, 14, 14, 0.1));
      }
      .periodo__titulo {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .periodo__titulo h1 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 700;
        line-height: 27px;
        color: #6e040b;
      }
      .periodo__icone {
        color: var(--primary-color);
      }
      .periodo__vigente {
        padding: 2px 8px;
        border-radius: var(--radius-pill);
        background: var(--gold-grad);
        color: #6e040b;
        font-size: 0.65625rem;
        font-weight: 700;
        line-height: 15.75px;
      }
      .periodo__intervalo {
        margin: 0;
        padding-top: 4px;
        font-size: 0.8125rem;
        color: var(--on-surface);
      }
      .periodo__seletor {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 16px;
      }
      .periodo__rotulo {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.78125rem;
        font-weight: 600;
        color: var(--on-surface);
      }
      .periodo__rotulo .aurum-ico {
        width: 14px;
        height: 14px;
      }
      .periodo__seletor select {
        min-width: min(400px, 100%);
        padding: 8px 40px 8px 20px;
        border: 1px solid var(--primary-color);
        border-radius: var(--radius-pill);
        background: var(--paper-bg) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5l5 5 5-5' fill='none' stroke='%238a0009' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E") right 16px center no-repeat;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        appearance: none;
        color: #6e040b;
        font-size: 0.84375rem;
        font-weight: 700;
        cursor: pointer;
      }
      .kpis {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 18px;
        margin-bottom: 20px;
      }
      .kpi__indisponivel {
        padding-top: 12px;
        font-family: var(--font-display);
        font-size: 1.125rem;
        font-style: italic;
        color: var(--on-surface);
      }
      .kpi__linha {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .kpi__variacao {
        display: inline-flex;
        align-items: center;
        font-weight: 700;
        color: var(--tone-success);
      }
      .kpi__variacao .aurum-ico {
        width: 14px;
        height: 14px;
      }
      .kpi__variacao--queda {
        color: var(--primary-color);
      }
      .kpi__variacao--queda .aurum-ico {
        transform: scaleY(-1);
      }
      .kpi__apagado {
        opacity: 0.8;
      }
      .kpi__barra {
        display: block;
        height: 6px;
        margin-top: 2px;
        overflow: hidden;
        border-radius: var(--radius-pill);
        background: rgba(0, 0, 0, 0.08);
      }
      .kpi__barra-cheia {
        display: block;
        height: 100%;
        background: var(--gold-grad);
      }
      .kpi__composto {
        padding-top: 12px;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 1.5rem;
        line-height: 36px;
        color: #6e040b;
      }
      .kpi__composto small {
        margin-right: 16px;
        font-size: 0.6875rem;
        font-weight: 500;
        color: var(--on-surface);
      }
      .listas {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
        gap: 20px;
        margin-bottom: 32px;
      }
      .lista {
        padding: 22px;
        border-radius: 18px;
      }
      .lista__cabecalho {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
      }
      .lista__cabecalho h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
        line-height: 24px;
        color: #6e040b;
      }
      .lista__cabecalho a {
        flex: none;
        color: var(--primary-color);
        font-size: 0.75rem;
        font-weight: 600;
        text-decoration: none;
      }
      .lista__item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px;
        margin-bottom: 10px;
        border-radius: 10px;
        background: var(--paper-bg);
      }
      .lista__item:last-child {
        margin-bottom: 0;
      }
      .lista__texto,
      .lista__valor {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .lista__valor {
        align-items: flex-end;
        gap: 4px;
        flex: none;
      }
      .lista__texto strong,
      .lista__valor strong {
        font-size: 0.8125rem;
        line-height: 19.5px;
        color: #6e040b;
      }
      .lista__texto span {
        font-size: 0.71875rem;
        line-height: 17.25px;
        color: var(--on-surface);
      }
      .secao {
        margin: 0 0 16px;
        font-size: 1.125rem;
        font-weight: 700;
        color: #6e040b;
      }
      .alerta {
        padding: 12px 16px;
        margin-bottom: 16px;
        background: var(--tone-warning-bg);
        border-radius: 10px;
        font-size: 0.8125rem;
        color: var(--tone-warning);
      }
      .alerta a {
        color: var(--primary-color);
        margin-left: 6px;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private service = inject(DashboardService);
  private lookups = inject(LookupsService);

  kpis: DashboardKpis | null = null;
  carregando = false;
  erro: string | null = null;

  periodos: PeriodoLookup[] = [];
  idPeriodoSelecionado: number | null = null;

  financeiro: DashboardFinanceiroKpis | null = null;
  carregandoFinanceiro = false;
  erroFinanceiro: string | null = null;

  reservas: DashboardReservaItem[] = [];
  pedidosInsercao: DashboardPedidoInsercaoItem[] = [];

  ngOnInit(): void {
    this.carregar();
    this.lookups.periodos().subscribe({ next: (p) => (this.periodos = p), error: () => (this.periodos = []) });
    this.carregarFinanceiro();
  }

  carregar(): void {
    this.carregando = true;
    this.erro = null;

    this.service.kpis().subscribe({
      next: (kpis) => {
        this.kpis = kpis;
        this.carregando = false;
      },
      error: (erro: unknown) => {
        this.carregando = false;
        this.erro = mensagemDeErro(erro, 'Não foi possível carregar os indicadores.');
      },
    });
  }

  /** Trocar o período recarrega TODOS os indicadores com o mesmo `Periodo.Id` (plano tático, seção 5). */
  aoTrocarPeriodo(): void {
    this.carregarFinanceiro(this.idPeriodoSelecionado);
  }

  private carregarFinanceiro(periodoId?: number | null): void {
    this.carregandoFinanceiro = true;
    this.erroFinanceiro = null;

    this.service.kpisFinanceiro(periodoId).subscribe({
      next: (financeiro) => {
        this.financeiro = financeiro;
        this.idPeriodoSelecionado = financeiro.periodo.id;
        this.carregandoFinanceiro = false;
        this.carregarListas(financeiro.periodo.id);
      },
      error: (erro: unknown) => {
        this.financeiro = null;
        this.carregandoFinanceiro = false;
        this.erroFinanceiro = mensagemDeErro(erro, 'Não foi possível carregar o painel financeiro.');
      },
    });
  }

  private carregarListas(periodoId: number): void {
    this.service.reservasDoPeriodo(periodoId, 5).subscribe({
      next: (reservas) => (this.reservas = reservas),
      error: () => (this.reservas = []),
    });
    this.service.pedidosInsercaoDoPeriodo(periodoId, 5).subscribe({
      next: (pis) => (this.pedidosInsercao = pis),
      error: () => (this.pedidosInsercao = []),
    });
  }

  /**
   * O BFF serializa a propriedade como `alertasAprovaçãoPendente` — com cedilha
   * e til, porque a propriedade anônima no `DashboardController` foi declarada
   * acentuada e a policy camelCase só rebaixa a primeira letra. Isolado aqui
   * para o template não carregar a estranheza.
   */
  aprovacaoPendente(kpis: DashboardKpis): number {
    return kpis['alertasAprovaçãoPendente'] ?? 0;
  }

  /**
   * `pt-BR` explícito em vez do pipe `currency` do Angular: não há `LOCALE_ID`
   * registrado no app (`app.config.ts`), então o pipe formataria no padrão
   * `en-US` (`R$1,234.56`) — mesma técnica já usada em `PecaValoresComponent`
   * e no modal de alteração de preço.
   */
  formatarMoeda(valor: number | null): string {
    if (valor === null) return '—';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  /** O Figma mostra os valores do painel sem centavos ("R$ 428.750"). */
  formatarMoedaInteira(valor: number | null): string {
    if (valor === null) return '—';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }

  tomReserva(status: string): AurumStatusPillTom {
    return TOM_STATUS_RESERVA[status] ?? 'neutro';
  }

  tomPedidoInsercao(status: string): AurumStatusPillTom {
    return TOM_STATUS_PEDIDO_INSERCAO[status] ?? 'neutro';
  }
}
