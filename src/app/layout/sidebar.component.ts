import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { PermissionService } from '../core/auth/permission.service';

interface ItemNav {
  rotulo: string;
  rota: string;
  permissao?: string;
}

interface GrupoNav {
  titulo: string;
  itens: ItemNav[];
}

/**
 * Menu lateral — ordem de grupos do PRD §4 / `Shell.tsx:16-54` (VEI-RD-76,
 * passo 6): Dashboard fora de grupo, depois Inventário, Comercial,
 * Operacional, Financeiro, Configurações.
 *
 * A sprint 10 só entrega rotas para um subconjunto do PRD. Cada item cuja
 * rota ainda não existe simplesmente não entra nesta lista — nunca aparece
 * como link morto nem desabilitado. Um card posterior "acende" o item
 * acrescentando-o aqui quando a rota é entregue, sem mudar a estrutura.
 * Um grupo cujos itens ficam todos ocultos (por rota ausente ou permissão
 * faltando) também não renderiza o título — um cabeçalho sem nada embaixo
 * não é melhor do que um link morto.
 */
const GRUPOS: GrupoNav[] = [
  {
    titulo: 'Inventário',
    itens: [{ rotulo: 'Locais & Peças', rota: '/locais', permissao: 'PecaGerenciar' }],
  },
  {
    titulo: 'Comercial',
    itens: [
      { rotulo: 'Solicitações de Reserva', rota: '/pedidos-reserva', permissao: 'PedidoReservaGerenciar' },
      { rotulo: 'Pedidos de Inserção', rota: '/pedidos-insercao', permissao: 'PedidoInsercaoGerenciar' },
    ],
  },
  {
    titulo: 'Operacional',
    itens: [
      { rotulo: 'Programação', rota: '/programacao', permissao: 'ProgramacaoVisualizar' },
      { rotulo: 'Checking', rota: '/checking', permissao: 'CheckingGerenciar' },
    ],
  },
  {
    titulo: 'Financeiro',
    itens: [],
  },
  {
    titulo: 'Configurações',
    itens: [{ rotulo: 'Usuários', rota: '/usuarios', permissao: 'UsuarioAfiliadaGerenciar' }],
  },
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterModule],
  template: `
    <aside class="sidebar-container">
      <nav class="sidebar-nav">
        <a routerLink="/dashboard" routerLinkActive="active" class="nav-item nav-item--dashboard">Dashboard</a>

        @for (grupo of grupos; track grupo.titulo) {
          @if (itensVisiveis(grupo).length > 0) {
            <div class="nav-section">
              <span class="section-title">{{ grupo.titulo }}</span>
              @for (item of itensVisiveis(grupo); track item.rota) {
                <a [routerLink]="item.rota" routerLinkActive="active" class="nav-item">{{ item.rotulo }}</a>
              }
            </div>
          }
        }
      </nav>
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
    .sidebar-container { width: 248px; background: var(--drawer-bg); color: color-mix(in srgb, var(--white) 72%, transparent); min-height: calc(100vh - 68px); padding: 24px 16px; }
    .nav-item--dashboard { display: block; margin-bottom: 20px; font-weight: 600; }
    .nav-section { margin-bottom: 24px; }
    .section-title { display: block; padding: 0 12px; font-size: 0.67rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--secondary-color); margin-bottom: 8px; font-weight: 700; }
    .nav-item { display: block; padding: 9px 12px; color: color-mix(in srgb, var(--white) 72%, transparent); text-decoration: none; border-left: 2px solid transparent; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; font-size: 0.88rem; margin-bottom: 3px; }
    .nav-item:hover { background: color-mix(in srgb, var(--white) 6%, transparent); color: var(--white); }
    .nav-item.active { background: color-mix(in srgb, var(--primary-color) 30%, transparent); border-left-color: var(--secondary-color); color: var(--white); font-weight: 600; }
    @media (max-width: 900px) {
      .sidebar-container { width: 100%; min-height: auto; padding: 12px 16px; overflow-x: auto; }
      .sidebar-nav { display: flex; gap: 20px; min-width: max-content; }
      .nav-section { margin: 0; display: flex; align-items: center; gap: 12px; }
    }
  `,
  ],
})
export class SidebarComponent {
  private permissionService = inject(PermissionService);

  readonly grupos = GRUPOS;

  itensVisiveis(grupo: GrupoNav): ItemNav[] {
    return grupo.itens.filter((item) => !item.permissao || this.permissionService.has(item.permissao));
  }
}
