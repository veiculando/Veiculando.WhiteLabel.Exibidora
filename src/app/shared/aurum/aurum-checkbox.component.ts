import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/** Checkbox de seleção em tabela — Valores de Peças, Ordem de Serviço, KYC. */
@Component({
  selector: 'aurum-checkbox',
  imports: [],
  template: `
    <input
      type="checkbox"
      class="aurum-checkbox"
      [checked]="marcado"
      [indeterminate]="indeterminado"
      [attr.aria-label]="rotulo"
      (change)="aoMudar($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-checkbox {
        width: 16px;
        height: 16px;
        accent-color: var(--primary-color);
      }
    `,
  ],
})
export class AurumCheckboxComponent {
  @Input() rotulo = '';
  @Input() marcado = false;
  @Input() indeterminado = false;

  @Output() marcadoChange = new EventEmitter<boolean>();

  aoMudar(event: Event): void {
    const marcado = (event.target as HTMLInputElement).checked;
    this.marcado = marcado;
    this.marcadoChange.emit(marcado);
  }
}
