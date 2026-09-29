import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface AurumDropdownOpcao {
  valor: string;
  rotulo: string;
}

/**
 * Select de filtro — frame `282:10112`. `<select>` nativo por baixo: teclado
 * e leitor de tela funcionam de graça, sem reimplementar um combobox ARIA.
 */
@Component({
  selector: 'aurum-dropdown',
  imports: [],
  template: `
    <select class="aurum-dropdown" (change)="aoMudar($event)">
      @for (opcao of opcoes; track opcao.valor) {
        <option [value]="opcao.valor" [selected]="opcao.valor === valor">{{ opcao.rotulo }}</option>
      }
    </select>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-dropdown {
        min-width: 136px;
        padding: 9px 32px 9px 12px;
        border: 1px solid var(--line-search);
        border-radius: var(--radius-search);
        /* Chevron em gradiente, não SVG em data URI: a cor segue o tema em runtime. */
        background:
          linear-gradient(45deg, transparent calc(50% - 0.6px), var(--on-surface) calc(50% - 0.6px), var(--on-surface) calc(50% + 0.6px), transparent calc(50% + 0.6px)) right 16px center / 4px 4px no-repeat,
          linear-gradient(-45deg, transparent calc(50% - 0.6px), var(--on-surface) calc(50% - 0.6px), var(--on-surface) calc(50% + 0.6px), transparent calc(50% + 0.6px)) right 12px center / 4px 4px no-repeat,
          var(--paper-bg);
        appearance: none;
        color: var(--on-surface);
        font: inherit;
        font-size: 0.8125rem;
        cursor: pointer;
      }
    `,
  ],
})
export class AurumDropdownComponent {
  @Input() opcoes: AurumDropdownOpcao[] = [];
  @Input() valor = '';

  @Output() valorChange = new EventEmitter<string>();

  aoMudar(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    this.valor = valor;
    this.valorChange.emit(valor);
  }
}
