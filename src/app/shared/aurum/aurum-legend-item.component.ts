import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Item de legenda da grade de Programação (consumido por VEI-RD-86) — marcador
 * colorido + texto sempre visível, nunca só a cor (PRD §7).
 */
@Component({
  selector: 'aurum-legend-item',
  imports: [],
  template: `
    <span class="aurum-legend-item" [attr.data-status]="rotulo">
      <span class="aurum-legend-item__marcador" aria-hidden="true"></span>
      {{ rotulo }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-legend-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.75rem;
        color: var(--on-surface);
      }
      .aurum-legend-item__marcador {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--border);
      }
    `,
  ],
})
export class AurumLegendItemComponent {
  @Input() rotulo = '';
}
