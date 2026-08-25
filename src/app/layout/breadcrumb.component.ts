import { Component, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-breadcrumb',
    imports: [RouterModule],
    template: `
    <div class="breadcrumb-container">
      <span class="breadcrumb-item"><a routerLink="/dashboard">Painel</a></span>
      @if (currentRoute) {
        <span class="separator">/</span>
      }
      @if (currentRoute) {
        <span class="current-page">{{ currentRoute }}</span>
      }
    </div>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    .breadcrumb-container { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--on-surface); margin-bottom: 18px; }
    .breadcrumb-item a { color: var(--primary-color); text-decoration: none; }
    .current-page { font-weight: 600; color: var(--charcoal); text-transform: capitalize; }
  `]
})
export class BreadcrumbComponent {
  currentRoute = '';

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const parts = event.urlAfterRedirects.split('/').filter(Boolean);
      this.currentRoute = parts.length > 0 ? parts[parts.length - 1].replace(/-/g, ' ') : '';
    });
  }
}
