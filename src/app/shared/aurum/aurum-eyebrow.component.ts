import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Rótulo eyebrow (caixa alta, cor gold escurecida) acima de títulos — usa `--eyebrow-color`. */
@Component({
  selector: 'aurum-eyebrow',
  imports: [],
  template: `
    @if (texto) {
      <span class="aurum-eyebrow">{{ texto }}</span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-eyebrow {
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--eyebrow-color);
      }
    `,
  ],
})
export class AurumEyebrowComponent {
  @Input() texto = '';
}
