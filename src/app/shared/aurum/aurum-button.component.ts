import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type AurumButtonVariante = 'wine' | 'gold' | 'outline' | 'ghost' | 'perigo' | 'sucesso';
export type AurumButtonTamanho = 'md' | 'sm';

/**
 * Botão pill (999px, sentence case) — variantes do Figma Aurum:
 * `wine` (ação primária), `gold` (gradiente — Baixar PI, Confirmar
 * alteração), `outline` (Limpar filtros, Ver fotos), `ghost` (Cancelar em
 * modal), e os contornos `perigo`/`sucesso` (Recusar/Aprovar checking).
 * `tamanho="sm"` é o botão de rodapé de modal (9×20, 13px).
 * Sem `@Output` próprio: o `<button>` nativo por dentro faz o clique borbulhar
 * através do host (sem shadow DOM), então `(click)` no elemento de quem
 * hospeda funciona direto, e `[disabled]` bloqueia o clique nativamente.
 */
@Component({
  selector: 'aurum-button',
  imports: [],
  template: `
    <button [type]="tipo" [class]="'aurum-button aurum-button--' + variante + (tamanho === 'sm' ? ' aurum-button--sm' : '')" [disabled]="desabilitado">
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
        padding: 12px 24px;
        font-size: 0.875rem;
        font-weight: 600;
        line-height: 1.2;
        white-space: nowrap;
        border: 1px solid transparent;
        cursor: pointer;
        transition: background-color 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
      }
      .aurum-button--sm {
        padding: 9px 20px;
        font-size: 0.8125rem;
      }
      .aurum-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .aurum-button--wine {
        background: var(--primary-color);
        color: var(--white);
        box-shadow: 0 8px 16px rgba(74, 14, 14, 0.1);
      }
      .aurum-button--wine:not(:disabled):hover {
        background: var(--primary-dark);
        box-shadow: var(--shadow-hover);
      }
      .aurum-button--gold {
        background: var(--gold-grad);
        color: var(--primary-dark);
        box-shadow: 0 2px 4px rgba(74, 14, 14, 0.15);
      }
      .aurum-button--gold:not(:disabled):hover {
        filter: brightness(1.04);
      }
      .aurum-button--outline {
        background: var(--white);
        color: var(--on-surface);
        border-color: rgba(0, 0, 0, 0.12);
      }
      .aurum-button--outline:not(:disabled):hover {
        background: var(--paper-bg);
      }
      .aurum-button--ghost {
        background: rgba(0, 0, 0, 0.06);
        color: var(--charcoal);
      }
      .aurum-button--ghost:not(:disabled):hover {
        background: rgba(0, 0, 0, 0.1);
      }
      .aurum-button--perigo {
        background: var(--white);
        color: var(--danger);
        border-color: var(--danger);
      }
      .aurum-button--perigo:not(:disabled):hover {
        background: var(--danger-bg);
      }
      .aurum-button--sucesso {
        background: var(--white);
        color: var(--tone-success);
        border-color: var(--tone-success);
      }
      .aurum-button--sucesso:not(:disabled):hover {
        background: var(--tone-success-bg);
      }
    `,
  ],
})
export class AurumButtonComponent {
  @Input() variante: AurumButtonVariante = 'wine';
  @Input() tamanho: AurumButtonTamanho = 'md';
  @Input() tipo: 'button' | 'submit' = 'button';
  @Input() desabilitado = false;
}
