import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Envelope de rótulo para um controle de filtro — frame `282:10112`.
 *
 * Dois layouts, decididos pelo Figma por tela: `embutido` ("Status: Todos",
 * a maioria das listagens) e `acima` (rótulo em caixa alta antes do
 * controle — só Programação: "PERIODICIDADE", "PERÍODO INICIAL"). O
 * controle em si (select, input, busca) é projetado por quem hospeda; este
 * componente só resolve rótulo + associação de acessibilidade.
 */
@Component({
  selector: 'aurum-filter-field',
  imports: [],
  template: `
    <label class="aurum-filter-field" [class.aurum-filter-field--acima]="posicaoRotulo === 'acima'">
      <span class="aurum-filter-field__rotulo">{{ rotulo }}{{ posicaoRotulo === 'embutido' ? ':' : '' }}</span>
      <ng-content />
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-filter-field {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8125rem;
        color: var(--on-surface);
      }
      .aurum-filter-field--acima {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
      .aurum-filter-field--acima .aurum-filter-field__rotulo {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.6875rem;
        font-weight: 600;
      }
      .aurum-filter-field__rotulo {
        white-space: nowrap;
      }
    `,
  ],
})
export class AurumFilterFieldComponent {
  @Input() rotulo = '';
  @Input() posicaoRotulo: 'embutido' | 'acima' = 'embutido';
}
