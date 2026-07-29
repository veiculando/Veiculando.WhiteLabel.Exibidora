import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BreadcrumbComponent } from './breadcrumb.component';
import { FooterComponent } from './footer.component';
import { HeaderComponent } from './header.component';
import { SidebarComponent } from './sidebar.component';

/**
 * Moldura das rotas autenticadas: header + sidebar + breadcrumb + footer.
 *
 * O TP-R3 entregou os quatro componentes de layout, mas nenhum deles estava
 * referenciado — o `AppComponent` importava apenas `RouterOutlet` (e o
 * smoke test de ag-grid da Sprint 8). Este componente e o que efetivamente
 * monta o shell.
 *
 * Fica como componente de rota, e nao dentro do `AppComponent`, para que
 * /login e /acesso-negado — que sao publicas e nao devem exibir menu nem
 * nome de operador — continuem fora da moldura.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, BreadcrumbComponent, FooterComponent],
  template: `
    <div class="shell">
      <app-header />
      <div class="shell__corpo">
        <app-sidebar />
        <main class="shell__conteudo">
          <app-breadcrumb />
          <router-outlet />
        </main>
      </div>
      <app-footer />
    </div>
  `,
  styles: [
    `
      .shell {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      .shell__corpo {
        display: flex;
        flex: 1;
        align-items: stretch;
      }
      .shell__conteudo {
        flex: 1;
        min-width: 0;
        padding: 20px 24px;
        background: var(--paper-bg);
      }
      @media (max-width: 900px) {
        .shell__corpo {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class ShellComponent {}
