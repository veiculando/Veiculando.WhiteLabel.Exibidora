import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CampanhasService } from '../../core/services/comercial.service';
import { CampanhaListItem, CampanhaPeriodo } from '../../core/models/comercial.models';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumCardComponent } from '../../shared/aurum/aurum-card.component';
import { AurumFilterFieldComponent } from '../../shared/aurum/aurum-filter-field.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent } from '../../shared/aurum/aurum-status-pill.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';
import { AurumTextInputComponent } from '../../shared/aurum/aurum-text-input.component';
import {
  AurumViewSelectorComponent,
  AurumViewSelectorModo,
} from '../../shared/aurum/aurum-view-selector.component';

/**
 * Campanhas de Mídia — VEI-RD-51, frame `154:5942`. **Módulo consultivo.**
 *
 * Nenhum controle mutável é renderizado: não existe "Nova Campanha", editar, excluir,
 * upload nem aprovar. Eles são OMITIDOS do DOM, não desabilitados (invariante #8) —
 * um botão `disabled` ainda promete a ação e volta a funcionar com uma linha de
 * DevTools; o que não existe no DOM não tem essa ambiguidade. O servidor concorda:
 * `CampanhasController` não declara verbo de mutação nenhum.
 *
 * O design chegou à mesma conclusão de forma independente: badge "Módulo Consultivo"
 * e nenhum botão de mutação em lugar nenhum do frame.
 */
@Component({
  selector: 'app-campanhas',
  imports: [
    FormsModule,
    AurumPageHeaderComponent,
    AurumButtonComponent,
    AurumCardComponent,
    AurumFilterFieldComponent,
    AurumTextInputComponent,
    AurumStatusPillComponent,
    AurumViewSelectorComponent,
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
  ],
  templateUrl: './campanhas.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .campanhas__barra { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 16px; }
      .campanhas__busca { flex: 1 1 340px; }
      .campanhas__chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
      .campanhas__chip { background: none; border: 1px solid var(--border-color); border-radius: 999px; padding: 6px 14px; cursor: pointer; font: inherit; color: var(--on-surface); }
      .campanhas__chip[aria-pressed='true'] { background: color-mix(in srgb, var(--primary-color) 12%, transparent); border-color: var(--primary-color); font-weight: 600; }
      .campanhas__cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
      .campanhas__codigo { font-size: 0.8rem; letter-spacing: 0.04em; color: var(--on-surface); }
      .campanhas__rodape { display: flex; justify-content: space-between; align-items: baseline; margin-top: 12px; }
      .campanhas__valor { font-weight: 700; }
      .campanhas__vazio { padding: 32px; text-align: center; color: var(--on-surface); }
    `,
  ],
})
export class CampanhasComponent implements OnInit {
  private serv = inject(CampanhasService);

  campanhas: CampanhaListItem[] = [];
  total = 0;
  carregando = false;
  erro = '';

  busca = '';
  status = '';
  /** Visão card é a desenhada; a de lista foi derivada — colunas a confirmar com o design. */
  modo: AurumViewSelectorModo = 'card';

  readonly chips = ['Todos', 'Ativa', 'Agendada', 'Encerrada', 'Cancelada'];

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.erro = '';
    this.serv.listar({ status: this.status || undefined, nome: this.busca || undefined }).subscribe({
      next: (pagina) => {
        this.campanhas = pagina.Itens;
        this.total = pagina.Total;
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Não foi possível carregar as campanhas.';
        this.carregando = false;
      },
    });
  }

  selecionarChip(chip: string): void {
    this.status = chip === 'Todos' ? '' : chip;
    this.carregar();
  }

  chipAtivo(chip: string): boolean {
    return chip === 'Todos' ? this.status === '' : this.status === chip;
  }

  /**
   * Agência vazia é "Venda Direta (Sem Agência)", nunca travessão (invariante #12).
   * Venda sem agência não é ausência de agência — é a agência-espelho da exibidora.
   */
  agencia(campanha: CampanhaListItem): string {
    return campanha.Agencia || 'Venda Direta (Sem Agência)';
  }

  /**
   * Rótulo E intervalo: `Bissemana 16 — 2026 (03/08/2026 - 16/08/2026)`.
   * Só o rótulo não diz quando; só o intervalo não diz qual período comercial é.
   */
  periodo(periodo: CampanhaPeriodo | null): string {
    if (!periodo) return '—';
    const inicio = new Date(periodo.DataInicio).toLocaleDateString('pt-BR');
    const fim = new Date(periodo.DataFim).toLocaleDateString('pt-BR');
    return `${periodo.Codigo} (${inicio} - ${fim})`;
  }

  valor(campanha: CampanhaListItem): string {
    return campanha.ValorTotal.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  rotuloStatus(status: number): string {
    return ['Rascunho', 'Ativa', 'Agendada', 'Encerrada', 'Cancelada'][status] ?? 'Campanha';
  }
}
