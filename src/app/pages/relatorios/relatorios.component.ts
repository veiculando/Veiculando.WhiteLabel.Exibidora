import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemDeErro } from '../../core/http/api-error';
import { PeriodoLookup, RelatorioResumo } from '../../core/models/wl.models';
import { PermissionService } from '../../core/auth/permission.service';
import { LookupsService } from '../../core/services/lookups.service';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumCardComponent } from '../../shared/aurum/aurum-card.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';
import { RelatoriosService } from './services/relatorios.service';

/**
 * Relatórios (Financeiro) — VEI-RD-92, Figma `286:11255`.
 *
 * A tela existe no Figma, mas o PRD v2.2 não tem seção para ela e o frame
 * não deixa claro quais agregações mostrar nem se a exportação é PDF ou CSV
 * — pendências deixadas explícitas (plano tático, seção 6), não resolvidas
 * por suposição. `/resumo` expõe as agregações inequívocas dos dados que já
 * existem; a exportação usa CSV como formato provisório mais defensável.
 *
 * "Faturamento Previsto" vem da MESMA fonte que o KPI do Dashboard
 * (`IReceitaService` no BFF) — enquanto a fórmula não for definida pelo
 * Humano, as duas telas mostram o mesmo "indisponível".
 */
@Component({
  selector: 'app-relatorios',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AurumPageHeaderComponent,
    AurumCardComponent,
    AurumButtonComponent,
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
  ],
  templateUrl: './relatorios.component.html',
  styles: [
    `
      .rel-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
      }
      .rel-toolbar select {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 6px 10px;
      }
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
        font-size: 1.6rem;
        color: var(--primary-dark);
      }
      .kpi__valor--indisponivel {
        font-size: 0.95rem;
        font-style: italic;
        color: var(--on-surface);
      }
      .rel-tabelas {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 24px;
      }
    `,
  ],
})
export class RelatoriosComponent implements OnInit {
  private readonly service = inject(RelatoriosService);
  private readonly lookups = inject(LookupsService);
  private readonly permissions = inject(PermissionService);

  /**
   * `RelatorioExportar` é distinta de `FinanceiroVisualizar` (que já protege
   * a rota inteira) — controla especificamente a ação de exportar. Omitida
   * do DOM quando ausente, não apenas desabilitada: um botão desabilitado
   * ainda revela que a ação existe, e o invariante do projeto é "controles
   * proibidos omitidos do DOM".
   */
  readonly podeExportar = this.permissions.has('RelatorioExportar');

  periodos: PeriodoLookup[] = [];
  idPeriodoSelecionado: number | null = null;

  resumo: RelatorioResumo | null = null;
  carregando = false;
  erro: string | null = null;
  exportando = false;
  erroExportacao: string | null = null;

  ngOnInit(): void {
    this.lookups.periodos().subscribe({
      next: (periodos) => {
        this.periodos = periodos;
        // Sem um "período vigente" próprio nesta tela, o mais recente da
        // lista (já ordenada por DataInicio desc no BFF) é o ponto de
        // partida razoável — o operador troca livremente no seletor.
        this.idPeriodoSelecionado = periodos[0]?.id ?? null;
        if (this.idPeriodoSelecionado) this.carregar();
      },
      error: () => (this.periodos = []),
    });
  }

  aoTrocarPeriodo(): void {
    this.carregar();
  }

  carregar(): void {
    if (!this.idPeriodoSelecionado) return;

    this.carregando = true;
    this.erro = null;

    this.service.resumo(this.idPeriodoSelecionado).subscribe({
      next: (resumo) => {
        this.resumo = resumo;
        this.carregando = false;
      },
      error: (erro: unknown) => {
        this.resumo = null;
        this.carregando = false;
        this.erro = mensagemDeErro(erro, 'Não foi possível carregar o relatório.');
      },
    });
  }

  exportar(): void {
    if (!this.idPeriodoSelecionado) return;

    this.exportando = true;
    this.erroExportacao = null;

    this.service.exportarCsv(this.idPeriodoSelecionado).subscribe({
      next: (blob) => {
        this.exportando = false;
        this.baixarArquivo(blob, `relatorio-financeiro-periodo-${this.idPeriodoSelecionado}.csv`);
      },
      error: (erro: unknown) => {
        this.exportando = false;
        this.erroExportacao = mensagemDeErro(erro, 'Não foi possível exportar o relatório.');
      },
    });
  }

  private baixarArquivo(blob: Blob, nomeArquivo: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
  }

  formatarMoeda(valor: number | null): string {
    if (valor === null) return '—';
    return (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
