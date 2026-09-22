import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Botão só-ícone — `rotulo` é obrigatório porque vira `aria-label`: ícone
 * sozinho não comunica (PRD §7). O ícone em si é projetado com `aria-hidden`.
 */
@Component({
  selector: 'aurum-icon-btn',
  imports: [],
  template: `
    <button type="button" class="aurum-icon-btn" [attr.aria-label]="rotulo" [disabled]="desabilitado">
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-icon-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--on-surface);
        cursor: pointer;
      }
      .aurum-icon-btn:not(:disabled):hover {
        background: var(--surface-muted);
        color: var(--primary-color);
      }
      .aurum-icon-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
})
export class AurumIconBtnComponent {
  @Input() rotulo!: string;
  @Input() desabilitado = false;
}
