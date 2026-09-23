import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface AurumBreadcrumbItem {
  rotulo: string;
  link?: string;
}

/** Trilha de navegação — usada em Locais e telas equivalentes com hierarquia. */
@Component({
  selector: 'aurum-breadcrumbs',
  imports: [RouterLink],
  template: `
    <nav class="aurum-breadcrumbs" aria-label="Trilha de navegação">
      <ol>
        @for (item of itens; track item.rotulo; let ultimo = $last) {
          <li>
            @if (!ultimo && item.link) {
              <a [routerLink]="item.link">{{ item.rotulo }}</a>
            } @else {
              <span aria-current="page">{{ item.rotulo }}</span>
            }
            @if (!ultimo) {
              <svg class="aurum-breadcrumbs__separador" viewBox="0 0 8 12" width="8" height="12" aria-hidden="true" focusable="false">
                <path d="M2 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-breadcrumbs ol {
        display: flex;
        align-items: center;
        gap: 8px;
        list-style: none;
        margin: 0;
        padding: 0;
        font-size: 0.8125rem;
      }
      .aurum-breadcrumbs li {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 24px;
      }
      .aurum-breadcrumbs a {
        color: var(--on-surface);
        text-decoration: none;
      }
      .aurum-breadcrumbs a:hover {
        color: var(--primary-color);
        text-decoration: underline;
      }
      .aurum-breadcrumbs [aria-current='page'] {
        color: var(--primary-color);
        font-weight: 600;
      }
      .aurum-breadcrumbs__separador {
        color: var(--on-surface);
      }
    `,
  ],
})
export class AurumBreadcrumbsComponent {
  @Input() itens: AurumBreadcrumbItem[] = [];
}
