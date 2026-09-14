import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { PermissionService } from '../core/auth/permission.service';

@Component({
    selector: 'app-sidebar',
    imports: [RouterModule],
    template: `
    <aside class="sidebar-container">
      <nav class="sidebar-nav">
        <div class="nav-section">
          <span class="section-title">Geral</span>
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">Dashboard</a>
        </div>
    
        <div class="nav-section">
          <span class="section-title">Inventário & Operação</span>
          @if (hasPermission('PecaGerenciar')) {
            <a routerLink="/locais" routerLinkActive="active" class="nav-item">Locais & Peças</a>
          }
          <a routerLink="/programacao" routerLinkActive="active" class="nav-item">Programação</a>
          @if (hasPermission('Checking')) {
            <a routerLink="/checking" routerLinkActive="active" class="nav-item">Checking</a>
          }
        </div>
    
        <div class="nav-section">
          <span class="section-title">Comercial</span>
          @if (hasPermission('PedidoReservaGerenciar')) {
            <a routerLink="/pedidos-reserva" routerLinkActive="active" class="nav-item">Pedidos de Reserva</a>
          }
          @if (hasPermission('PedidoInsercaoGerenciar')) {
            <a routerLink="/pedidos-insercao" routerLinkActive="active" class="nav-item">Pedidos de Inserção</a>
          }
        </div>
    
        @if (hasPermission('UsuarioAfiliadaGerenciar')) {
          <div class="nav-section">
            <span class="section-title">Administração</span>
            <a routerLink="/usuarios" routerLinkActive="active" class="nav-item">Operadores</a>
          </div>
        }
      </nav>
    </aside>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    .sidebar-container { width: 248px; background: var(--charcoal); color: color-mix(in srgb, var(--white) 72%, transparent); min-height: calc(100vh - 68px); padding: 24px 16px; }
    .nav-section { margin-bottom: 24px; }
    .section-title { display: block; padding: 0 12px; font-size: 0.67rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--secondary-color); margin-bottom: 8px; font-weight: 700; }
    .nav-item { display: block; padding: 9px 12px; color: color-mix(in srgb, var(--white) 72%, transparent); text-decoration: none; border-left: 2px solid transparent; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; font-size: 0.88rem; margin-bottom: 3px; }
    .nav-item:hover { background: color-mix(in srgb, var(--white) 6%, transparent); color: var(--white); }
    .nav-item.active { background: color-mix(in srgb, var(--primary-color) 30%, transparent); border-left-color: var(--secondary-color); color: var(--white); font-weight: 600; }
    @media (max-width: 900px) {
      .sidebar-container { width: 100%; min-height: auto; padding: 12px 16px; overflow-x: auto; }
      .sidebar-nav { display: flex; gap: 20px; min-width: max-content; }
      .nav-section { margin: 0; }
    }
  `]
})
export class SidebarComponent {
  private permissionService = inject(PermissionService);

  hasPermission(perm: string): boolean {
    return this.permissionService.has(perm);
  }
}
