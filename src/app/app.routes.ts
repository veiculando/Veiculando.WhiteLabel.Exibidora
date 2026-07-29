import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

/**
 * Rotas da Exibidora WL.
 *
 * Permissões granulares são configuradas via `data.permission` em cada rota protegida.
 * O `authGuard` lê essa propriedade e valida contra as claims do JWT (ADR-WL-007).
 *
 * Whitelist de permissões válidas (espelham WlPermissoesValidas do domínio):
 *  - 'PecaGerenciar'
 *  - 'Checking'
 *  - 'PedidoReservaGerenciar'
 *  - 'PedidoInsercaoGerenciar'
 *  - 'UsuarioAfiliadaGerenciar'
 *
 * Toda a área autenticada é filha do `ShellComponent` (header/sidebar/breadcrumb/
 * footer); /login e /acesso-negado ficam fora dele por serem públicas.
 */
export const routes: Routes = [
  // Rota pública: login
  {
    path: 'login',
    title: 'Entrar — Painel Exibidora',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },

  // Rota de acesso negado
  {
    path: 'acesso-negado',
    title: 'Acesso negado',
    loadComponent: () =>
      import('./pages/acesso-negado/acesso-negado.component').then((m) => m.AcessoNegadoComponent),
  },

  // Área protegida — qualquer operador autenticado
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },

      // --- Inventário & Operação ---
      {
        path: 'locais',
        title: 'Locais e peças',
        data: { permission: 'PecaGerenciar' },
        loadComponent: () => import('./pages/locais/locais.component').then((m) => m.LocaisComponent),
      },
      {
        path: 'programacao',
        title: 'Programação',
        loadComponent: () =>
          import('./pages/programacao/programacao.component').then((m) => m.ProgramacaoComponent),
      },
      {
        path: 'checking',
        title: 'Checking',
        data: { permission: 'Checking' },
        loadComponent: () =>
          import('./pages/checking/checking.component').then((m) => m.CheckingComponent),
      },

      // --- Comercial ---
      {
        path: 'pedidos-reserva',
        title: 'Pedidos de reserva',
        data: { permission: 'PedidoReservaGerenciar' },
        loadComponent: () =>
          import('./pages/pedidos-reserva/pedidos-reserva.component').then(
            (m) => m.PedidosReservaComponent
          ),
      },
      {
        path: 'pedidos-insercao',
        title: 'Pedidos de inserção',
        data: { permission: 'PedidoInsercaoGerenciar' },
        loadComponent: () =>
          import('./pages/pedidos-insercao/pedidos-insercao.component').then(
            (m) => m.PedidosInsercaoComponent
          ),
      },

      // --- Administração ---
      {
        path: 'usuarios',
        title: 'Operadores',
        data: { permission: 'UsuarioAfiliadaGerenciar' },
        loadComponent: () =>
          import('./pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
    ],
  },

  // Fallback
  { path: '**', redirectTo: 'dashboard' },
];
