import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Célula de status de peça×período na grade de Programação (consumido por
 * VEI-RD-86). O período corrente recebe o badge `ATUAL` — é como o Figma
 * resolve o destaque pedido pelo PRD.
 */
@Component({
  selector: 'aurum-period-cell',
  imports: [],
  template: `
    <span class="aurum-period-cell" [attr.data-status]="status">
      <span class="aurum-period-cell__marcador" aria-hidden="true"></span>
      {{ status }}
      @if (atual) {
        <span class="aurum-period-cell__atual">ATUAL</span>
      }
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-period-cell {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.75rem;
        color: var(--on-surface);
      }
      .aurum-period-cell__marcador {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--border);
      }
      .aurum-period-cell__atual {
        border-radius: var(--radius-pill);
        background: var(--primary-color);
        color: var(--white);
        font-size: 0.625rem;
        font-weight: 700;
        text-transform: uppercase;
        padding: 1px 6px;
      }
    `,
  ],
})
export class AurumPeriodCellComponent {
  @Input() status = '';
  @Input() atual = false;
}
