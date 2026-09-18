import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Primitives de tabela — Table Cell (100×), Header Cell (21×), DataRow (16×)
 * do inventário do Figma. Seletores de atributo sobre `table`/`tr`/`th`/`td`
 * nativos: tabela é semântica sensível a aninhamento, então não existe
 * wrapper de elemento custom aqui — só classes de estilo sobre o DOM nativo.
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
        border-collapse: collapse;
        font-size: 0.875rem;
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
      :host {
        border-bottom: 1px solid var(--divider);
      }
      tbody :host:hover {
        background: var(--surface-muted);
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
        padding: 12px 16px;
        text-align: left;
        color: var(--charcoal);
      }
    `,
  ],
})
export class AurumTableCellComponent {}

/** Cabeçalho caixa-alta 11px, letter-spacing .1em — conforme o design system. */
@Component({
  selector: 'th[aurumTableHeaderCell]',
  imports: [],
  template: `<ng-content />`,
  host: { class: 'aurum-table__header-cell' },
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host {
        padding: 10px 16px;
        text-align: left;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--on-surface);
      }
    `,
  ],
})
export class AurumTableHeaderCellComponent {}
