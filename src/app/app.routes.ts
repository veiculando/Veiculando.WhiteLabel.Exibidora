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
 *  - 'CheckingGerenciar' (renomeada de 'Checking' em VEI-RD-93 — confirmado
 *    lendo WlPermissoesValidas.cs real no workspace irmão `Veiculando`)
 *  - 'PedidoReservaGerenciar'
 *  - 'PedidoInsercaoGerenciar'
 *  - 'UsuarioAfiliadaGerenciar'
 *
 * Toda a área autenticada é filha do `ShellComponent` (header/sidebar/breadcrumb/
 * footer); /login e /acesso-negado ficam fora dele por serem públicas.
 *
 * ⚠️ `canActivate: [authGuard]` precisa estar **em cada rota filha** que declare
 * `data.permission`, e não só na rota pai. O guard recebe o
 * `ActivatedRouteSnapshot` da rota em que está declarado: no pai (`path: ''`),
 * `route.data` não contém o `permission` do filho, então `permissaoExigida` sai
 * `undefined` e a checagem de permissão simplesmente não acontece — o guard vira
 * só uma verificação de sessão. Data de rota é herdada de pai para filho, nunca
 * o contrário.
 *
 * O guard no pai continua ali de propósito: cobre `/dashboard` e `/programacao`,
 * que exigem sessão mas nenhuma permissão específica.
 */
export const routes: Routes = [
  // Rota pública: login
  {
    path: 'login',
    title: 'Entrar — Painel Exibidora',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },

  // Recuperação de senha — públicas, fora do ShellComponent (o operador ainda
  // não tem sessão nesta etapa).
  {
    path: 'login/esqueci-senha',
    title: 'Esqueci minha senha — Painel Exibidora',
    loadComponent: () =>
      import('./pages/login/esqueci-senha.component').then((m) => m.EsqueciSenhaComponent),
  },
  {
    path: 'login/alterar-senha',
    title: 'Redefinir senha — Painel Exibidora',
    loadComponent: () =>
      import('./pages/login/alterar-senha.component').then((m) => m.AlterarSenhaComponent),
  },
  {
    path: 'login/primeiro-acesso',
    title: 'Criar senha — Painel Exibidora',
    data: { primeiroAcesso: true },
    loadComponent: () =>
      import('./pages/login/alterar-senha.component').then((m) => m.AlterarSenhaComponent),
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
        canActivate: [authGuard],
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
        data: { permission: 'CheckingGerenciar' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/checking/checking.component').then((m) => m.CheckingComponent),
      },
      {
        path: 'checkout',
        title: 'Check out',
        data: { permission: 'CheckingGerenciar' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/checkout/checkout-listagem.component').then((m) => m.CheckoutListagemComponent),
      },
      {
        path: 'checkout/:id',
        title: 'Check out',
        data: { permission: 'CheckingGerenciar' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/checkout/checkout-detalhe.component').then((m) => m.CheckoutDetalheComponent),
      },
      // --- Ordem de Serviço (VEI-RD-88) ---
      //
      // `OrdensServicoController` real reusa a policy `PecaGerenciar` (já na
      // whitelist — uma OS é, no fim, uma operação sobre peças). Confirmado
      // lendo o controller no workspace irmão do BFF, 2026-09-22.
      //
      // ⚠️ Nenhuma rota `/atribuir` ou `/reatribuir` aqui — regra dura,
      // decisão humana 2026-09-17: a atribuição de colador não existe nesta
      // sprint, nem como opção de UI nem como destino de navegação.
      {
        path: 'ordens-servico',
        title: 'Ordem de Serviço',
        data: { permission: 'PecaGerenciar' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/ordem-servico/ordem-servico-listagem.component').then(
            (m) => m.OrdemServicoListagemComponent
          ),
      },
      {
        path: 'ordens-servico/nova',
        title: 'Gerar Ordem de Serviço',
        data: { permission: 'PecaGerenciar' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/ordem-servico/ordem-servico-geracao.component').then(
            (m) => m.OrdemServicoGeracaoComponent
          ),
      },
      {
        path: 'ordens-servico/:id',
        title: 'Ordem de Serviço',
        data: { permission: 'PecaGerenciar' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/ordem-servico/ordem-servico-detalhe.component').then(
            (m) => m.OrdemServicoDetalheComponent
          ),
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
        title: 'Pedidos de reserva',
        data: { permission: 'PedidoReservaGerenciar' },
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/pedidos-reserva/pedidos-reserva.component').then(
            (m) => m.PedidosReservaComponent
          ),
      },
      {
        path: 'pedidos-insercao',
        title: 'Pedidos de inserção',
        data: { permission: 'PedidoInsercaoGerenciar' },
        canActivate: [authGuard],
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
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
    ],
  },

  // Fallback
  { path: '**', redirectTo: 'dashboard' },
];
