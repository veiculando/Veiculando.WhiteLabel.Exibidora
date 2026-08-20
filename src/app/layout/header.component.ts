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
    .header-container { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background: #1e1e2d; color: #fff; border-bottom: 3px solid var(--primary-color); }
    .header-brand { display: flex; align-items: center; gap: 12px; }
    .header-logo { height: 32px; }
    .header-title { font-weight: 600; font-size: 1.1rem; }
    .header-user { display: flex; align-items: center; gap: 16px; }
    .btn-logout { background: transparent; border: 1px solid #444; color: #fff; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
    .btn-logout:hover { background: #333; }
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
