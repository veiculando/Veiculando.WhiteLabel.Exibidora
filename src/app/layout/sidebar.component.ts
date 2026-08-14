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
    .sidebar-container { width: 240px; background: #151521; color: #a2a3b7; min-height: calc(100vh - 60px); padding: 16px; }
    .nav-section { margin-bottom: 24px; }
    .section-title { display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: #4c4e69; margin-bottom: 8px; font-weight: 700; }
    .nav-item { display: block; padding: 8px 12px; color: #a2a3b7; text-decoration: none; border-radius: 4px; font-size: 0.9rem; margin-bottom: 4px; }
    .nav-item:hover, .nav-item.active { background: #1e1e2d; color: #ffffff; }
  `]
})
export class SidebarComponent {
  private permissionService = inject(PermissionService);

  hasPermission(perm: string): boolean {
    return this.permissionService.has(perm);
  }
}
