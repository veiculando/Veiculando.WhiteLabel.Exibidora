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
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--white);
        color: var(--charcoal);
        padding: 6px 10px;
        font: inherit;
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
