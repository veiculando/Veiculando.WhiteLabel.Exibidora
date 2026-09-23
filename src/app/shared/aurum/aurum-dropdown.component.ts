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
        background: var(--paper-bg) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M1 1l3 3 3-3' fill='none' stroke='%23544341' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E") right 12px center no-repeat;
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
