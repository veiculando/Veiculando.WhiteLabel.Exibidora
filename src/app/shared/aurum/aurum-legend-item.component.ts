import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { tomDoStatusProgramacao } from './aurum-period-cell.component';

/**
 * Item de legenda da grade de Programação (consumido por VEI-RD-86) — marcador
 * colorido + texto sempre visível, nunca só a cor (PRD §7).
 */
@Component({
  selector: 'aurum-legend-item',
  imports: [],
  template: `
    <span class="aurum-legend-item" [attr.data-status]="rotulo" [attr.data-tom]="tomDoStatus(rotulo)">
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
        font-size: 0.78125rem;
        color: var(--on-surface);
      }
      .aurum-legend-item__marcador {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--tom, var(--border));
      }
      [data-tom='solicitado'] { --tom: var(--tone-solid-orange); }
      [data-tom='reservado'] { --tom: var(--tone-solid-blue); }
      [data-tom='autorizado'] { --tom: var(--tone-solid-purple); }
      [data-tom='faturado'] { --tom: var(--tone-solid-green); }
      [data-tom='indisponivel'] { --tom: var(--tone-solid-gray); }
    `,
  ],
})
export class AurumLegendItemComponent {
  @Input() rotulo = '';

  readonly tomDoStatus = tomDoStatusProgramacao;
}
