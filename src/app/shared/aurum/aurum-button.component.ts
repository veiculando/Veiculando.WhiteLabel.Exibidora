import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type AurumButtonVariante = 'wine' | 'gold' | 'outline' | 'ghost' | 'perigo';

/**
 * Botão pill (999px, uppercase) — 113 ocorrências no Figma, nas quatro
 * variantes do design system (wine/gold/outline/ghost), mais `perigo` —
 * mesma forma do `ghost`, tom `--danger`, para ações destrutivas (ex.:
 * excluir), espelhando os tons de `aurum-status-pill`.
 * Sem `@Output` próprio: o `<button>` nativo por dentro faz o clique borbulhar
 * através do host (sem shadow DOM), então `(click)` no elemento de quem
 * hospeda funciona direto, e `[disabled]` bloqueia o clique nativamente.
 */
@Component({
  selector: 'aurum-button',
  imports: [],
  template: `
    <button [type]="tipo" [class]="'aurum-button aurum-button--' + variante" [disabled]="desabilitado">
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      /*
       * inline-block, como um <button> nativo: por padrao encolhe para o
       * conteudo, mas respeita width definido por quem hospeda (ex.: botao
       * de submit ocupando a largura do formulario de login). O botao
       * interno e width:100% do host de propósito, para que o host seja o
       * unico ponto de controle de largura.
       */
      :host {
        display: inline-block;
      }
      .aurum-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
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
      .aurum-button--perigo {
        background: transparent;
        color: var(--danger);
      }
      .aurum-button--perigo:not(:disabled):hover {
        background: var(--danger-bg);
      }
    `,
  ],
})
export class AurumButtonComponent {
  @Input() variante: AurumButtonVariante = 'wine';
  @Input() tipo: 'button' | 'submit' = 'button';
  @Input() desabilitado = false;
}
