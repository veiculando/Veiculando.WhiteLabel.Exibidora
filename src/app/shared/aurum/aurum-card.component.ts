import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Painel elevado (sombra suave + borda sutil) — substitui `.wl-card` (ADR-WL-010). */
@Component({
  selector: 'aurum-card',
  imports: [],
  template: `<ng-content />`,
  host: { class: 'aurum-card' },
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host {
        display: block;
        background: var(--white);
        border: 1px solid var(--line-subtle);
        border-radius: var(--radius-card);
        box-shadow: var(--shadow-card);
        padding: 24px;
      }
    `,
  ],
})
export class AurumCardComponent {}

/** Painel plano (sem sombra) — agrupamento visual leve, sem competir com um Card. */
@Component({
  selector: 'aurum-surface',
  imports: [],
  template: `<ng-content />`,
  host: { class: 'aurum-surface' },
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host {
        display: block;
        background: var(--paper-bg);
        border-radius: var(--radius-search);
        padding: 16px;
      }
    `,
  ],
})
export class AurumSurfaceComponent {}

/** Divisor horizontal — seletor de atributo sobre `hr` nativo. */
@Component({
  selector: 'hr[aurumDivider]',
  imports: [],
  template: '',
  host: { class: 'aurum-divider' },
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host {
        border: none;
        border-top: 1px solid var(--divider);
        margin: 16px 0;
      }
    `,
  ],
})
export class AurumDividerComponent {}
