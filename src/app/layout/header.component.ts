import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule, Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { SecureStorage } from '../core/auth/secure-storage';
import { BrandingService } from '../core/branding/branding.service';
import { PermissionService } from '../core/auth/permission.service';

@Component({
    selector: 'app-header',
    imports: [RouterModule],
    template: `
    <header class="header-container" [style.borderBottomColor]="brand()?.primaryColor">
      <div class="header-brand">
        @if (brand()?.logoUrl && !hasLogoError) {
          <img [src]="brand()?.logoUrl" [alt]="'Logo ' + (brand()?.nomeExibicao ?? '')" class="header-logo" (error)="onLogoError()" />
        }
        <span class="header-title">{{ brand()?.nomeExibicao }} — Painel Exibidora</span>
      </div>
      <div class="header-user">
        <span class="user-name">{{ operatorName }}</span>
        <button (click)="logout()" class="btn-logout">Sair</button>
      </div>
    </header>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    .header-container { display: flex; justify-content: space-between; align-items: center; min-height: 68px; padding: 10px 24px; background: var(--header-footer-bg); color: var(--white); border-bottom: 3px solid var(--secondary-color); }
    .header-brand { display: flex; align-items: center; gap: 12px; }
    .header-logo { width: auto; max-width: 150px; height: 42px; object-fit: contain; }
    .header-title { font-family: var(--font-display); font-weight: 600; font-size: 1.15rem; }
    .header-user { display: flex; align-items: center; gap: 16px; }
    .user-name { font-size: 0.82rem; color: color-mix(in srgb, var(--white) 78%, transparent); }
    .btn-logout { background: transparent; border: 1px solid color-mix(in srgb, var(--white) 35%, transparent); color: var(--white); padding: 6px 14px; border-radius: var(--radius-pill); cursor: pointer; }
    .btn-logout:hover { border-color: var(--secondary-color); color: var(--secondary-color); }
    @media (max-width: 640px) {
      .header-title, .user-name { display: none; }
    }
  `]
})
export class HeaderComponent {
  readonly brand = inject(BrandingService).branding;
  hasLogoError = false;

  private permissionService = inject(PermissionService);
  private router = inject(Router);

  get operatorName(): string {
    return this.permissionService.getOperatorName();
  }

  onLogoError() {
    this.hasLogoError = true;
  }

  logout() {
    SecureStorage.clear(environment.tokenKey);
    this.router.navigate(['/login']);
  }
}
