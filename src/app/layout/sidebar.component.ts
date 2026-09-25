import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';

import { Router, RouterModule } from '@angular/router';
import { environment } from '../../environments/environment';
import { PermissionService } from '../core/auth/permission.service';
import { SecureStorage } from '../core/auth/secure-storage';
import { BrandingService } from '../core/branding/branding.service';

interface ItemNav {
  rotulo: string;
  rota: string;
  /** Arquivo `assets/aurum/icon-<icone>.svg`, aplicado como máscara sobre `currentColor`. */
  icone: string;
  permissao?: string;
  /** Prospecção abre o App WL em outra aba — o Figma marca com ícone externo. */
  externo?: boolean;
}

interface GrupoNav {
  titulo: string;
  icone: string;
  itens: ItemNav[];
}

/**
 * Menu lateral — nó `421:28546` do Figma Aurum: Dashboard fora de grupo,
 * depois Inventário, Cadastros, Comercial, Operacional, Financeiro e
 * Configurações, cada grupo como acordeão. Aberto tem 288px; colapsado tem
 * 64px só com ícones, e o grupo abre num flyout ao lado.
 *
 * Checking saiu do menu (não há tela no Figma); a rota e o guard continuam.
 *
 * A sprint 10 só entrega rotas para um subconjunto do PRD. Cada item cuja
 * rota ainda não existe simplesmente não entra nesta lista — nunca aparece
 * como link morto nem desabilitado. Um card posterior "acende" o item
 * acrescentando-o aqui quando a rota é entregue, sem mudar a estrutura.
 * Um grupo cujos itens ficam todos ocultos (por rota ausente ou permissão
 * faltando) também não renderiza o título — um cabeçalho sem nada embaixo
 * não é melhor do que um link morto.
 *
 * Os ícones do Figma vêm com a cor fixa (ouro); aplicados como máscara, eles
 * herdam `--secondary-color`, então a troca de tenant continua re-tematizando
 * o menu, e o item ativo fica escuro sobre o gradiente.
 */
const GRUPOS: GrupoNav[] = [
  {
    titulo: 'Inventário',
    icone: 'inventario',
    itens: [
      { rotulo: 'Locais', rota: '/locais', icone: 'locais', permissao: 'PecaGerenciar' },
      { rotulo: 'Valores de Peças', rota: '/pecas/valores', icone: 'valores', permissao: 'PecaGerenciar' },
    ],
  },
  {
    titulo: 'Cadastros',
    icone: 'cadastros',
    itens: [
      { rotulo: 'Agências', rota: '/agencias', icone: 'agencias', permissao: 'ClienteGerenciar' },
      { rotulo: 'Análises KYC', rota: '/kyc', icone: 'kyc', permissao: 'ClienteGerenciar' },
      { rotulo: 'Cadastros do App', rota: '/kyc/app', icone: 'kyc', permissao: 'ClienteGerenciar' },
    ],
  },
  {
    titulo: 'Comercial',
    icone: 'comercial',
    itens: [
      // Ordem do PRD §4: Prospecção antes de Campanhas, e Campanhas antes das
      // Solicitações de Reserva.
      { rotulo: 'Prospecção', rota: '/prospeccao', icone: 'prospeccao', permissao: 'PedidoCriar', externo: true },
      { rotulo: 'Campanhas', rota: '/campanhas', icone: 'campanhas', permissao: 'ClienteGerenciar' },
      { rotulo: 'Solicitações de Reserva', rota: '/pedidos-reserva', icone: 'reservas', permissao: 'PedidoReservaGerenciar' },
      { rotulo: 'Pedidos de Inserção', rota: '/pedidos-insercao', icone: 'pedidos-insercao', permissao: 'PedidoInsercaoGerenciar' },
    ],
  },
  {
    titulo: 'Operacional',
    icone: 'operacional',
    itens: [
      { rotulo: 'Programação', rota: '/programacao', icone: 'programacao', permissao: 'ProgramacaoVisualizar' },
      // O Figma não desenha ícone para Check out e Ordem de Serviço: reaproveitam
      // o escudo de verificação e a chave do grupo Operacional.
      { rotulo: 'Check out', rota: '/checkout', icone: 'kyc', permissao: 'CheckingGerenciar' },
      { rotulo: 'Ordem de Serviço', rota: '/ordens-servico', icone: 'operacional', permissao: 'PecaGerenciar' },
    ],
  },
  {
    titulo: 'Financeiro',
    icone: 'financeiro',
    itens: [{ rotulo: 'Relatórios', rota: '/relatorios', icone: 'relatorios', permissao: 'FinanceiroVisualizar' }],
  },
  {
    titulo: 'Configurações',
    icone: 'configuracoes',
    itens: [
      { rotulo: 'Cadastro e acesso', rota: '/configuracoes/cadastro-acesso', icone: 'cadastro-acesso', permissao: 'UsuarioAfiliadaGerenciar' },
      { rotulo: 'Usuários', rota: '/usuarios', icone: 'usuarios', permissao: 'UsuarioAfiliadaGerenciar' },
    ],
  },
];

const CHAVE_COLAPSADO = 'wl-sidebar-colapsado';

@Component({
  selector: 'app-sidebar',
  imports: [RouterModule],
  template: `
    <aside class="sb" [class.sb--colapsado]="colapsado()">
      <div class="sb__marca">
        @if (!colapsado()) {
          <div class="sb__marca-texto">
            <span class="sb__nome">{{ brand()?.nomeExibicao }}</span>
            <span class="sb__linha">
              <span class="sb__produto">Exibidora WL</span>
              @if (afiliadaId) {
                <span class="sb__afiliada">Afiliada #{{ afiliadaId }}</span>
              }
            </span>
          </div>
        }
        <button
          type="button"
          class="sb__alternar"
          [attr.aria-label]="colapsado() ? 'Expandir menu' : 'Recolher menu'"
          [attr.aria-expanded]="!colapsado()"
          (click)="alternarColapsado()"
        >
          <span class="aurum-ico sb-ico sb-ico--menu" [style.--ico]="icone('menu')"></span>
        </button>
      </div>

      <nav class="sidebar-nav" aria-label="Menu principal">
        <a
          routerLink="/dashboard"
          routerLinkActive="active"
          class="nav-item nav-item--dashboard"
          [attr.title]="colapsado() ? 'Dashboard' : null"
        >
          <span class="aurum-ico sb-ico" [style.--ico]="icone('dashboard')"></span>
          <span class="nav-item__rotulo">Dashboard</span>
        </a>
        @if (colapsado()) {
          <span class="sb__separador" aria-hidden="true"></span>
        }

        @for (grupo of grupos; track grupo.titulo) {
          @if (itensVisiveis(grupo).length > 0) {
            <div class="nav-section" (mouseleave)="fecharFlyout(grupo.titulo)">
              <button
                type="button"
                class="section-title"
                [attr.aria-expanded]="colapsado() ? flyout() === grupo.titulo : grupoAberto(grupo.titulo)"
                [attr.title]="colapsado() ? grupo.titulo : null"
                (click)="alternarGrupo(grupo.titulo)"
                (mouseenter)="abrirFlyout(grupo.titulo)"
              >
                <span class="aurum-ico sb-ico" [style.--ico]="icone(grupo.icone)"></span>
                <span class="nav-item__rotulo">{{ grupo.titulo }}</span>
                <span
                  class="aurum-ico sb-ico sb-ico--chevron"
                  [class.sb-ico--chevron-aberto]="grupoAberto(grupo.titulo)"
                  [style.--ico]="icone('chevron')"
                ></span>
              </button>
              <div
                class="nav-section__itens"
                [hidden]="colapsado() ? flyout() !== grupo.titulo : !grupoAberto(grupo.titulo)"
              >
                @if (colapsado()) {
                  <span class="nav-section__flyout-titulo" aria-hidden="true">
                    <span class="aurum-ico sb-ico" [style.--ico]="icone(grupo.icone)"></span>
                    {{ grupo.titulo }}
                  </span>
                }
                @for (item of itensVisiveis(grupo); track item.rota) {
                  <a [routerLink]="item.rota" routerLinkActive="active" class="nav-item nav-item--filho" (click)="flyout.set(null)">
                    <span class="aurum-ico sb-ico" [style.--ico]="icone(item.icone)"></span>
                    <span class="nav-item__rotulo">{{ item.rotulo }}</span>
                    @if (item.externo) {
                      <span class="aurum-ico sb-ico sb-ico--externo" [style.--ico]="icone('externo')"></span>
                    }
                  </a>
                }
              </div>
            </div>
          }
        }
      </nav>

      <div class="sb__rodape">
        <button type="button" class="sb__sair" [attr.aria-label]="colapsado() ? 'Sair da Sessão' : null" (click)="sair()">
          <span class="aurum-ico sb-ico sb-ico--sair" [style.--ico]="icone('sair')"></span>
          <span class="nav-item__rotulo">Sair da Sessão</span>
        </button>
      </div>
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
    :host {
      display: block;
      flex: none;
      position: sticky;
      top: 0;
      height: 100vh;
      z-index: 20;
    }
    .sb {
      display: flex;
      flex-direction: column;
      width: 288px;
      height: 100%;
      background: var(--sidebar-bg) url(/assets/aurum/sidebar-textura.png) center / cover;
      color: var(--paper-bg);
      transition: width 180ms ease;
    }
    .sb--colapsado {
      width: 64px;
    }

    .sb-ico {
      color: var(--secondary-color);
    }
    .sb-ico--menu {
      width: 15px;
      height: 15px;
      color: var(--gold-light);
    }
    .sb-ico--chevron {
      width: 14px;
      height: 14px;
      margin-left: auto;
      transform: rotate(-90deg);
      transition: transform 160ms ease;
    }
    .sb-ico--chevron-aberto {
      transform: rotate(0deg);
    }
    .sb-ico--externo {
      width: 12px;
      height: 12px;
      margin-left: auto;
    }
    .sb-ico--sair {
      width: 13px;
      height: 13px;
      color: var(--gold-light);
    }

    .sb__marca {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 87px;
      padding: 20px;
      border-bottom: 1px solid color-mix(in srgb, var(--secondary-color) 20%, transparent);
    }
    .sb--colapsado .sb__marca {
      justify-content: center;
      padding: 20px 0;
    }
    .sb__marca-texto {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .sb__nome {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.25rem;
      line-height: 22px;
      font-variation-settings: 'SOFT' 0, 'WONK' 1;
      color: var(--paper-bg);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sb__linha {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 7px;
    }
    .sb__produto {
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 18px;
      color: var(--secondary-color);
      white-space: nowrap;
    }
    .sb__afiliada {
      padding: 1px 8px;
      border: 1px solid color-mix(in srgb, var(--secondary-color) 45%, transparent);
      border-radius: var(--radius-pill);
      font-size: 0.6875rem;
      line-height: 16.5px;
      color: var(--secondary-color);
      white-space: nowrap;
    }
    .sb__alternar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border: none;
      background: transparent;
      cursor: pointer;
    }

    .sidebar-nav {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px;
      overflow-y: auto;
    }
    .sb--colapsado .sidebar-nav {
      align-items: center;
      gap: 4px;
      overflow: visible;
    }

    .nav-item,
    .section-title {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-height: 36px;
      padding: 0 12px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--paper-bg);
      font-family: var(--font-ui);
      font-size: 0.875rem;
      line-height: 21px;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
    }
    .section-title {
      font-weight: 600;
    }
    .nav-item {
      font-weight: 500;
    }
    .nav-item--filho {
      padding-left: 24px;
      color: color-mix(in srgb, var(--paper-bg) 88%, transparent);
    }
    .nav-item:hover,
    .section-title:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .nav-item.active,
    .nav-item.active:hover {
      background: var(--gold-grad);
      color: var(--primary-dark);
      filter: drop-shadow(0 2px 4px rgba(74, 14, 14, 0.25));
    }
    .nav-item.active .sb-ico {
      color: var(--primary-dark);
    }

    .sb--colapsado .nav-item--dashboard,
    .sb--colapsado .section-title {
      justify-content: center;
      width: 40px;
      height: 40px;
      padding: 0;
    }
    .sb--colapsado .nav-item--dashboard .nav-item__rotulo,
    .sb--colapsado .section-title .nav-item__rotulo {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
    .sb--colapsado .section-title .sb-ico--chevron {
      display: none;
    }
    .sb__separador {
      display: block;
      width: 28px;
      height: 1px;
      margin: 6px 0;
      background: color-mix(in srgb, var(--secondary-color) 20%, transparent);
    }

    .nav-section {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .nav-section__itens {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .nav-section__itens[hidden] {
      display: none;
    }
    .sb--colapsado .nav-section__itens {
      position: absolute;
      top: 0;
      left: calc(100% + 12px);
      min-width: 240px;
      padding: 8px;
      border: 1px solid color-mix(in srgb, var(--secondary-color) 18%, transparent);
      border-radius: 12px;
      background: var(--sidebar-bg);
      box-shadow: 0 16px 32px rgba(26, 5, 5, 0.35);
    }
    .sb--colapsado .nav-item--filho {
      padding-left: 20px;
    }
    .nav-section__flyout-titulo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px 10px;
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1rem;
      color: var(--paper-bg);
    }
    .nav-section__flyout-titulo .sb-ico {
      width: 16px;
      height: 16px;
    }

    .sb__rodape {
      padding: 24px 14px 14px;
      background: rgba(0, 0, 0, 0.12);
      border-top: 1px solid color-mix(in srgb, var(--secondary-color) 16%, transparent);
    }
    .sb__sair {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 7px 12px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--paper-bg);
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 18px;
      cursor: pointer;
    }
    .sb__sair:hover {
      background: rgba(255, 255, 255, 0.14);
    }
    .sb--colapsado .sb__rodape {
      display: flex;
      justify-content: center;
      padding: 14px 0;
      background: transparent;
    }
    .sb--colapsado .sb__sair {
      width: auto;
      padding: 8px;
      border: none;
      background: transparent;
    }
    .sb--colapsado .sb__sair .nav-item__rotulo {
      display: none;
    }

    @media (max-width: 900px) {
      :host {
        position: static;
        height: auto;
      }
      .sb,
      .sb--colapsado {
        width: 100%;
      }
    }
  `,
  ],
})
export class SidebarComponent {
  private permissionService = inject(PermissionService);
  private router = inject(Router);
  readonly brand = inject(BrandingService).branding;

  readonly grupos = GRUPOS;
  readonly afiliadaId = this.permissionService.getAfiliadaId();
  readonly colapsado = signal(this.lerColapsado());
  /** Grupo cujo flyout está aberto no modo colapsado. */
  readonly flyout = signal<string | null>(null);
  /** Acordeão: todos os grupos começam abertos, como nas telas do Figma. */
  private readonly fechados = signal<ReadonlySet<string>>(new Set());

  itensVisiveis(grupo: GrupoNav): ItemNav[] {
    return grupo.itens.filter((item) => !item.permissao || this.permissionService.has(item.permissao));
  }

  icone(nome: string): string {
    return `url(/assets/aurum/icon-${nome}.svg)`;
  }

  grupoAberto(titulo: string): boolean {
    return !this.fechados().has(titulo);
  }

  alternarGrupo(titulo: string): void {
    if (this.colapsado()) {
      this.flyout.set(this.flyout() === titulo ? null : titulo);
      return;
    }
    const proximos = new Set(this.fechados());
    if (proximos.has(titulo)) proximos.delete(titulo);
    else proximos.add(titulo);
    this.fechados.set(proximos);
  }

  abrirFlyout(titulo: string): void {
    if (this.colapsado()) this.flyout.set(titulo);
  }

  fecharFlyout(titulo: string): void {
    if (this.flyout() === titulo) this.flyout.set(null);
  }

  alternarColapsado(): void {
    const proximo = !this.colapsado();
    this.colapsado.set(proximo);
    this.flyout.set(null);
    try {
      localStorage.setItem(CHAVE_COLAPSADO, String(proximo));
    } catch {
      // Storage indisponível — a preferência vale só para a sessão atual.
    }
  }

  sair(): void {
    SecureStorage.clear(environment.tokenKey);
    this.router.navigate(['/login']);
  }

  private lerColapsado(): boolean {
    try {
      return localStorage.getItem(CHAVE_COLAPSADO) === 'true';
    } catch {
      return false;
    }
  }
}
