import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="header-container" [style.borderBottomColor]="primaryColor">
      <div class="header-brand">
        <img [src]="logoUrl" alt="Logo" class="header-logo" *ngIf="logoUrl" />
        <span class="header-title">Painel Exibidora WL</span>
      </div>
      <div class="header-user">
        <span class="user-name">Operador WL</span>
        <button (click)="logout()" class="btn-logout">Sair</button>
      </div>
    </header>
  `,
  styles: [`
    .header-container { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background: #1e1e2d; color: #fff; border-bottom: 3px solid #8a0009; }
    .header-brand { display: flex; align-items: center; gap: 12px; }
    .header-logo { height: 32px; }
    .header-title { font-weight: 600; font-size: 1.1rem; }
    .header-user { display: flex; align-items: center; gap: 16px; }
    .btn-logout { background: transparent; border: 1px solid #444; color: #fff; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
    .btn-logout:hover { background: #333; }
  `]
})
export class HeaderComponent {
  primaryColor = environment.branding.primaryColor;
  logoUrl = environment.branding.logoUrl;

  constructor(private router: Router) {}

  logout() {
    localStorage.removeItem(environment.tokenKey);
    this.router.navigate(['/auth/login']);
  }
}
