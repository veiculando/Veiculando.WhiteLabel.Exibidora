import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Primitives de tabela — Table Cell (100×), Header Cell (21×), DataRow (16×)
 * do inventário do Figma. Seletores de atributo sobre `table`/`tr`/`th`/`td`
 * nativos: tabela é semântica sensível a aninhamento, então não existe
 * wrapper de elemento custom aqui — só classes de estilo sobre o DOM nativo.
 * `class="aurum-table--densa"` no `<table>` dá a versão compacta das telas
 * operacionais.
 */
@Component({
  selector: 'table[aurumTable]',
  imports: [],
  template: `<ng-content />`,
  host: { class: 'aurum-table' },
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        overflow: hidden;
        font-size: 0.875rem;
        background: var(--white);
        border: 1px solid var(--line-subtle);
        border-radius: var(--radius-card);
        box-shadow: var(--shadow-card);
      }
    `,
  ],
})
export class AurumTableComponent {}

@Component({
  selector: 'tr[aurumTableRow]',
  imports: [],
  template: `<ng-content />`,
  host: { class: 'aurum-table__row' },
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      tbody :host:hover {
        background: #faf9f6;
      }
    `,
  ],
})
export class AurumTableRowComponent {}

@Component({
  selector: 'td[aurumTableCell]',
  imports: [],
  template: `<ng-content />`,
  host: { class: 'aurum-table__cell' },
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host {
        padding: 20px 24px;
        text-align: left;
        vertical-align: middle;
        color: var(--charcoal);
        border-bottom: 1px solid var(--line-subtle);
      }
      :host-context(tbody tr:last-child) {
        border-bottom: none;
      }
      /* Tabelas operacionais do Figma (Check out, OS, KYC): 13px, menos respiro. */
      :host-context(.aurum-table--densa) {
        padding: 14px 12px;
        font-size: 0.8125rem;
      }
    `,
  ],
})
export class AurumTableCellComponent {}

/** Cabeçalho do Figma Aurum: 12px bold caixa-alta, tracking .5px, fundo papel. */
@Component({
  selector: 'th[aurumTableHeaderCell]',
  imports: [],
  template: `<ng-content />`,
  host: { class: 'aurum-table__header-cell' },
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host {
        padding: 16px 24px;
        text-align: left;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--on-surface);
        background: var(--paper-bg);
        border-bottom: 1px solid var(--line-subtle);
        white-space: nowrap;
      }
      :host-context(.aurum-table--densa) {
        padding: 14px 12px;
        font-size: 11px;
      }
    `,
  ],
})
export class AurumTableHeaderCellComponent {}
