import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

/**
 * Rotas da Exibidora WL.
 * 
 * Permissões granulares são configuradas via `data.permission` em cada rota protegida.
 * O `authGuard` lê essa propriedade e valida contra as claims do JWT (ADR-WL-007).
 * 
 * Permissões disponíveis (espelham as colunas de WL_Usuario):
 *  - 'PecaGerenciar'
 *  - 'PedidoReservaGerenciar'
 *  - 'FinanceiroVisualizar'
 *  - 'ClienteGerenciar'
 */
export const routes: Routes = [
  // Rota pública: login
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent),
  },

  // Rota de acesso negado
  {
    path: 'acesso-negado',
    loadComponent: () =>
      import('./pages/acesso-negado/acesso-negado.component').then(m => m.AcessoNegadoComponent),
  },

  // Área protegida — qualquer operador autenticado
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },

      // --- Inventário ---
      {
        path: 'locais',
        data: { permission: 'PecaGerenciar' }, // Gerenciar locais implica permissão de Peça
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/locais/locais.component').then(m => m.LocaisComponent),
      },
      {
        path: 'locais/novo',
        data: { permission: 'PecaGerenciar' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/locais/wizard/local-wizard.component').then(m => m.LocalWizardComponent),
      },
      {
        path: 'locais/:id',
        data: { permission: 'PecaGerenciar' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/locais/wizard/local-wizard.component').then(m => m.LocalWizardComponent),
      },
      {
        path: 'locais/:idLocal/pecas/nova',
        data: { permission: 'PecaGerenciar' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/locais/pecas/peca-form.component').then(m => m.PecaFormComponent),
      },
      {
        path: 'locais/:idLocal/pecas/:idPeca',
        data: { permission: 'PecaGerenciar' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/locais/pecas/peca-form.component').then(m => m.PecaFormComponent),
      },

      // --- Comercial ---
      {
        path: 'pedidos-reserva',
        data: { permission: 'PedidoReservaGerenciar' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/pedidos-reserva/pedidos-reserva.component').then(m => m.PedidosReservaComponent),
      },
      {
        path: 'campanhas',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/campanhas/campanhas.component').then(m => m.CampanhasComponent),
      },
      {
        path: 'clientes',
        data: { permission: 'ClienteGerenciar' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/clientes/clientes.component').then(m => m.ClientesComponent),
      },

      // --- Financeiro (permissão restrita) ---
      {
        path: 'financeiro',
        data: { permission: 'FinanceiroVisualizar' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/financeiro/financeiro.component').then(m => m.FinanceiroComponent),
      },

      // --- Administração ---
      {
        path: 'usuarios',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent),
      },
    ],
  },

  // Fallback
  { path: '**', redirectTo: 'dashboard' },
];
