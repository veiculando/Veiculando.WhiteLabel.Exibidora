import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type AurumButtonVariante = 'wine' | 'gold' | 'outline' | 'ghost';

/**
 * Botão pill (999px, uppercase) — 113 ocorrências no Figma, quatro variantes.
 * Sem `@Output` próprio: o `<button>` nativo por dentro faz o clique borbulhar
 * através do host (sem shadow DOM), então `(click)` no elemento de quem
 * hospeda funciona direto, e `[disabled]` bloqueia o clique nativamente.
 */
@Component({
  selector: 'aurum-button',
  imports: [],
  template: `
    <button type="button" [class]="'aurum-button aurum-button--' + variante" [disabled]="desabilitado">
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border-radius: var(--radius-pill);
        padding: 10px 20px;
        font-size: 0.8125rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        border: 1px solid transparent;
        cursor: pointer;
      }
      .aurum-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .aurum-button--wine {
        background: var(--primary-color);
        color: var(--white);
        box-shadow: var(--shadow-base);
      }
      .aurum-button--wine:not(:disabled):hover {
        background: var(--primary-dark);
        box-shadow: var(--shadow-hover);
      }
      .aurum-button--gold {
        background: var(--secondary-color);
        color: var(--charcoal);
      }
      .aurum-button--gold:not(:disabled):hover {
        background: var(--gold-light);
      }
      .aurum-button--outline {
        background: transparent;
        color: var(--primary-color);
        border-color: var(--primary-color);
      }
      .aurum-button--outline:not(:disabled):hover {
        background: color-mix(in srgb, var(--primary-color) 8%, transparent);
      }
      .aurum-button--ghost {
        background: transparent;
        color: var(--on-surface);
      }
      .aurum-button--ghost:not(:disabled):hover {
        background: var(--surface-muted);
      }
    `,
  ],
})
export class AurumButtonComponent {
  @Input() variante: AurumButtonVariante = 'wine';
  @Input() desabilitado = false;
}
