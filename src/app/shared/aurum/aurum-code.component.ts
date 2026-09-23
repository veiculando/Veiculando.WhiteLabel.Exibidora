import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Código de entidade em monoespaçada (SJC-LED-0142, PEC-…, RES-…, CMP-…) —
 * chip vinho translúcido do Figma Aurum (`226:6963`, Code Col).
 */
@Component({
  selector: 'aurum-code',
  imports: [],
  template: `<ng-content />`,
  host: { class: 'aurum-code' },
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        padding: 3px 8px;
        border-radius: 6px;
        background: var(--wine-tint);
        color: var(--primary-color);
        font-family: var(--font-mono);
        font-size: 0.75rem;
        font-weight: 700;
        line-height: normal;
        white-space: nowrap;
      }
    `,
  ],
})
export class AurumCodeComponent {}
