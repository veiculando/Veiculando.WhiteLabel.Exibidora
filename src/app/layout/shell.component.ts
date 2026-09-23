import { Component, ChangeDetectionStrategy } from '@angular/core';
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
    imports: [RouterOutlet, HeaderComponent, SidebarComponent, BreadcrumbComponent, FooterComponent],
    template: `
    <div class="shell">
      <app-sidebar />
      <div class="shell__corpo">
        <app-header />
        <main class="shell__conteudo">
          <app-breadcrumb />
          <router-outlet />
        </main>
        <app-footer />
      </div>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [
        `
      /* Figma Aurum: sidebar de altura total à esquerda; header e footer
         ocupam só a coluna de conteúdo. */
      .shell {
        display: flex;
        min-height: 100vh;
        background: var(--paper-bg);
      }
      .shell__corpo {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
      }
      .shell__conteudo {
        flex: 1;
        min-width: 0;
        padding: 24px 40px 40px;
        background: var(--paper-bg);
      }
      @media (max-width: 900px) {
        .shell {
          flex-direction: column;
        }
        .shell__conteudo {
          padding: 16px;
        }
      }
    `,
    ]
})
export class ShellComponent {}
