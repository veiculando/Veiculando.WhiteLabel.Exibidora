import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { mensagemDeErro } from '../../core/http/api-error';
import { DashboardKpis } from '../../core/models/wl.models';
import { DashboardService } from '../../core/services/dashboard.service';

/**
 * KPIs operacionais da exibidora — `GET /api/wl/dashboard/kpis`.
 *
 * Card `e2f22c9c`. Todos os números vêm do BFF já escopados pela afiliada da
 * instância; o frontend não recalcula nada.
 */
@Component({
    selector: 'app-dashboard',
    imports: [RouterLink],
    template: `
    <div class="wl-page">
      <h1 class="wl-page__titulo">Dashboard operacional</h1>
      <p class="wl-page__descricao">Visão geral do inventário e da operação da exibidora.</p>
    
      @if (carregando) {
        <div class="wl-estado wl-estado--carregando">Carregando indicadores…</div>
      }
    
      @if (erro) {
        <div class="wl-estado wl-estado--erro">
          {{ erro }}
          <button class="wl-btn wl-btn--link" type="button" (click)="carregar()">Tentar novamente</button>
        </div>
      }
    
      @if (kpis; as k) {
        <!-- Alerta de aprovação pendente: locais criados pela Exibidora entram
        como StatusExibicao = AprovacaoPendente e são liberados no Admin. -->
        @if (aprovacaoPendente(k) > 0) {
          <div class="alerta">
            <strong>{{ aprovacaoPendente(k) }}</strong>
            {{ aprovacaoPendente(k) === 1 ? 'local aguarda aprovação' : 'locais aguardam aprovação' }}.
            A liberação é feita pela equipe Veiculando no painel Admin.
            <a routerLink="/locais">Ver locais</a>
          </div>
        }
        <div class="kpis">
          <div class="kpi">
            <span class="kpi__rotulo">Locais ativos</span>
            <span class="kpi__valor">{{ k.locaisAtivos }}</span>
          </div>
          <div class="kpi">
            <span class="kpi__rotulo">Peças em exibição</span>
            <span class="kpi__valor">{{ k.pecasEmExibicao }}</span>
          </div>
          <div class="kpi">
            <span class="kpi__rotulo">Pedidos pendentes</span>
            <span class="kpi__valor">{{ k.pedidosPendentes }}</span>
          </div>
          <!-- Sem card de Receita mensal, de propósito (TP-B, seção 2): o BFF
          não calcula esse valor (nenhuma regra financeira aprovada ainda) e
          não devolve mais o campo. Mostrar zero como se fosse dado real é
          proibido pelo PRD vigente — a saída não é "rotular o zero melhor",
          é não apresentar o card até existir a regra de verdade. -->
        </div>
      }
    </div>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [
        `
      .kpis {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }
      .kpi {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 18px;
        background: var(--white);
        border: 1px solid #e1e3ea;
        border-radius: var(--radius-sm);
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
      .alerta {
        padding: 12px 16px;
        margin-bottom: 16px;
        background: #fff4d6;
        border: 1px solid #f0d79a;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        color: #6b4b00;
      }
      .alerta a {
        color: var(--primary-color);
        margin-left: 6px;
      }
    `,
    ]
})
export class DashboardComponent implements OnInit {
  private service = inject(DashboardService);

  kpis: DashboardKpis | null = null;
  carregando = false;
  erro: string | null = null;

  ngOnInit(): void {
    this.carregar();
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

  /**
   * O BFF serializa a propriedade como `alertasAprovaçãoPendente` — com cedilha
   * e til, porque a propriedade anônima no `DashboardController` foi declarada
   * acentuada e a policy camelCase só rebaixa a primeira letra. Isolado aqui
   * para o template não carregar a estranheza.
   */
  aprovacaoPendente(kpis: DashboardKpis): number {
    return kpis['alertasAprovaçãoPendente'] ?? 0;
  }
}
