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
              <span class="aurum-breadcrumbs__separador" aria-hidden="true">/</span>
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
        gap: 6px;
        list-style: none;
        margin: 0;
        padding: 0;
        font-size: 0.8125rem;
      }
      .aurum-breadcrumbs li {
        display: flex;
        align-items: center;
        gap: 6px;
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
        color: var(--charcoal);
        font-weight: 600;
      }
      .aurum-breadcrumbs__separador {
        color: var(--border);
      }
    `,
  ],
})
export class AurumBreadcrumbsComponent {
  @Input() itens: AurumBreadcrumbItem[] = [];
}
