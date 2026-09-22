import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/** Campo de busca com ícone — frame `282:10112`. Rótulo textual sempre presente via `aria-label`. */
@Component({
  selector: 'aurum-text-input',
  imports: [],
  template: `
    <span class="aurum-text-input">
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
        <circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" stroke-width="1.4" />
        <line x1="10" y1="10" x2="14.5" y2="14.5" stroke="currentColor" stroke-width="1.4" />
      </svg>
      <input
        type="text"
        [value]="valor"
        [placeholder]="placeholder"
        [attr.aria-label]="rotulo || placeholder"
        (input)="aoDigitar($event)"
      />
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-text-input {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--border);
        border-radius: var(--radius-pill);
        background: var(--white);
        padding: 6px 12px;
        color: var(--on-surface);
      }
      .aurum-text-input input {
        border: none;
        outline: none;
        background: transparent;
        font: inherit;
        color: var(--charcoal);
        flex: 1;
        min-width: 0;
      }
    `,
  ],
})
export class AurumTextInputComponent {
  @Input() valor = '';
  @Input() placeholder = '';
  @Input() rotulo = '';

  @Output() valorChange = new EventEmitter<string>();

  aoDigitar(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.valor = valor;
    this.valorChange.emit(valor);
  }
}
