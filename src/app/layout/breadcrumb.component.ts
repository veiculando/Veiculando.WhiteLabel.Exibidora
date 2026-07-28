import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="breadcrumb-container">
      <span class="breadcrumb-item"><a routerLink="/dashboard">Painel</a></span>
      <span class="separator" *ngIf="currentRoute">/</span>
      <span class="current-page" *ngIf="currentRoute">{{ currentRoute }}</span>
    </div>
  `,
  styles: [`
    .breadcrumb-container { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #6c757d; margin-bottom: 16px; }
    .breadcrumb-item a { color: #8a0009; text-decoration: none; }
    .current-page { font-weight: 600; color: #3f4254; text-transform: capitalize; }
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
