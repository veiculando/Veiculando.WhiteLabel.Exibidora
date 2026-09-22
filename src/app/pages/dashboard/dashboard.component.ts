import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { mensagemDeErro } from '../../core/http/api-error';
import {
  DashboardFinanceiroKpis,
  DashboardKpis,
  DashboardPedidoInsercaoItem,
  DashboardReservaItem,
  PeriodoLookup,
} from '../../core/models/wl.models';
import { DashboardService } from '../../core/services/dashboard.service';
import { LookupsService } from '../../core/services/lookups.service';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumCardComponent } from '../../shared/aurum/aurum-card.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent } from '../../shared/aurum/aurum-status-pill.component';

/**
 * Dashboard operacional + painel financeiro (VEI-RD-85) — Figma `153:1265`.
 *
 * A seção "Visão operacional" (Locais ativos / Peças em exibição / Pedidos
 * pendentes / alerta de aprovação pendente) é a tela pré-existente — mantida
 * como está, sem escopo de período; o Figma redesenha o painel FINANCEIRO
 * (os "4 KPIs" desta Ordem), não substitui esse alerta operacional, que não
 * tem equivalente no frame novo.
 *
 * O botão "Testar Erro" do Figma é instrumentação de desenvolvimento
 * (plano tático, seção 5) — não implementado aqui, de propósito.
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AurumPageHeaderComponent,
    AurumCardComponent,
    AurumButtonComponent,
    AurumStatusPillComponent,
  ],
  templateUrl: './dashboard.component.html',
  styles: [
    `
      .kpis {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .kpi {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .kpi__rotulo {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: var(--on-surface);
      }
      .kpi__valor {
        font-family: var(--font-display);
        font-size: 1.8rem;
        color: var(--primary-dark);
      }
      .kpi__valor--indisponivel {
        font-size: 1rem;
        color: var(--on-surface);
        font-style: italic;
      }
      .kpi__detalhe {
        font-size: 0.8125rem;
        color: var(--on-surface);
      }
      .alerta {
        padding: 12px 16px;
        margin-bottom: 16px;
        background: var(--warning-bg);
        border: 1px solid var(--warning-border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        color: var(--warning);
      }
      .alerta a {
        color: var(--primary-color);
        margin-left: 6px;
      }
      .periodo-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
      }
      .periodo-header__info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .periodo-header select {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 6px 10px;
      }
      .listas {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 16px;
      }
      .lista-cabecalho {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .lista-cabecalho a {
        color: var(--primary-color);
        text-decoration: none;
        font-size: 0.8125rem;
      }
      .lista-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 0;
        border-bottom: 1px solid var(--divider);
        font-size: 0.8125rem;
      }
      .lista-item:last-child {
        border-bottom: none;
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
}
