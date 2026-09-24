import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AurumEyebrowComponent } from './aurum-eyebrow.component';

/**
 * Cabeçalho de página — Figma Aurum (ex.: `226:6963`): título Fraunces 28 +
 * badge (`badge` ou projetado via `aurumPageHeaderBadge`) + subtítulo à
 * esquerda, ações (via `aurumPageHeaderAcoes`) alinhadas à direita.
 * A composição de badge/ações fica a cargo de quem hospeda, para não engessar
 * o cabeçalho num layout único — cada tela tem uma combinação diferente.
 */
@Component({
  selector: 'aurum-page-header',
  imports: [AurumEyebrowComponent],
  template: `
    <header class="aurum-page-header">
      <div class="aurum-page-header__texto">
        <aurum-eyebrow [texto]="eyebrow" />
        <div class="aurum-page-header__linha">
          <h1 class="aurum-page-header__titulo">{{ titulo }}</h1>
          @if (badge) {
            <span class="aurum-page-header__badge">{{ badge }}</span>
          }
          <ng-content select="[aurumPageHeaderBadge]" />
        </div>
        @if (subtitulo) {
          <p class="aurum-page-header__subtitulo">{{ subtitulo }}</p>
        }
        <ng-content select="[aurumPageHeaderSubtitulo]" />
      </div>
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
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 24px;
      }
      .aurum-page-header__texto {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      .aurum-page-header__linha {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .aurum-page-header__titulo {
        margin: 0;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 1.75rem;
        line-height: 1.2;
        letter-spacing: 0;
        color: var(--primary-dark);
      }
      .aurum-page-header__badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 12px;
        border-radius: var(--radius-pill);
        background: var(--wine-tint);
        color: var(--primary-color);
        font-size: 0.75rem;
        font-weight: 700;
        white-space: nowrap;
      }
      .aurum-page-header__subtitulo {
        margin: 0;
        color: var(--on-surface);
        font-size: 0.875rem;
      }
      .aurum-page-header__acoes {
        display: flex;
        align-items: center;
        gap: 12px;
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
  /** Contador ao lado do título ("8 pontos", "Afiliada #4821") — pill vinho translúcida. */
  @Input() badge = '';
}
