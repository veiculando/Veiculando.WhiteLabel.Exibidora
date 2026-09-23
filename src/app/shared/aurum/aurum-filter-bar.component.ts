import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Barra de filtros do Figma Aurum (`226:6963`, Filter Control Bar): cartão
 * branco com busca, filtros e o alternador lista/cartão numa linha só.
 * Filhos com `aurumFilterBarDivisor` viram a barra vertical entre grupos.
 */
@Component({
  selector: 'aurum-filter-bar',
  imports: [],
  template: `<ng-content />`,
  host: { class: 'aurum-filter-bar' },
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 24px;
        padding: 16px;
        background: var(--white);
        border: 1px solid var(--line-subtle);
        border-radius: var(--radius-card);
        filter: drop-shadow(var(--shadow-bar));
      }
      :host ::ng-deep > aurum-text-input {
        flex: 1 1 280px;
      }
      :host ::ng-deep > [aurumFilterBarDivisor] {
        align-self: stretch;
        width: 1px;
        background: var(--line-search);
      }
    `,
  ],
})
export class AurumFilterBarComponent {}
