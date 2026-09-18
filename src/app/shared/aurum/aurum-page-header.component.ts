import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AurumEyebrowComponent } from './aurum-eyebrow.component';

/**
 * Cabeçalho de página — frame `282:10093`: eyebrow + título + badge (projetado
 * via `aurumPageHeaderBadge`) + subtítulo + ações (via `aurumPageHeaderAcoes`).
 * A composição de badge/ações fica a cargo de quem hospeda, para não engessar
 * o cabeçalho num layout único — cada tela tem uma combinação diferente.
 */
@Component({
  selector: 'aurum-page-header',
  imports: [AurumEyebrowComponent],
  template: `
    <header class="aurum-page-header">
      <aurum-eyebrow [texto]="eyebrow" />
      <div class="aurum-page-header__linha">
        <h1 class="aurum-page-header__titulo">{{ titulo }}</h1>
        <ng-content select="[aurumPageHeaderBadge]" />
      </div>
      @if (subtitulo) {
        <p class="aurum-page-header__subtitulo">{{ subtitulo }}</p>
      }
      <div class="aurum-page-header__acoes">
        <ng-content select="[aurumPageHeaderAcoes]" />
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-page-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 20px;
      }
      .aurum-page-header__linha {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .aurum-page-header__titulo {
        margin: 0;
        font-size: 1.75rem;
      }
      .aurum-page-header__subtitulo {
        margin: 0;
        color: var(--on-surface);
        font-size: 0.9375rem;
      }
      .aurum-page-header__acoes {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .aurum-page-header__acoes:empty {
        display: none;
      }
    `,
  ],
})
export class AurumPageHeaderComponent {
  @Input() eyebrow = '';
  @Input() titulo = '';
  @Input() subtitulo = '';
}
