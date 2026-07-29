import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * Destino de quem tem token válido mas não tem a permissão exigida.
 *
 * Alcançada por dois caminhos:
 *  - o `authGuard`, quando a rota declara `data.permission` e o JWT não a tem;
 *  - o `authErrorInterceptor`, quando o BFF responde 403 a uma chamada que
 *    escapou do guard (deep link, permissão revogada no meio da sessão).
 *
 * Fica FORA do shell de propósito: se o operador chegou aqui por falta de
 * permissão, exibir o menu completo ao lado da mensagem seria contraditório.
 */
@Component({
  selector: 'app-acesso-negado',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="negado">
      <div class="negado__caixa">
        <h1 class="negado__titulo">Acesso negado</h1>
        <p class="negado__texto">
          Sua conta está autenticada, mas não tem permissão para acessar esta área.
          Fale com o administrador da exibidora se você precisa desse acesso.
        </p>
        <div class="negado__acoes">
          <a class="wl-btn" routerLink="/dashboard">Ir para o Dashboard</a>
          <button class="wl-btn wl-btn--secundario" type="button" (click)="sair()">Sair</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .negado {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 24px;
        background: var(--paper-bg);
      }
      .negado__caixa {
        max-width: 460px;
        padding: 28px;
        text-align: center;
        background: var(--white);
        border: 1px solid #e1e3ea;
        border-radius: var(--radius-md);
      }
      .negado__titulo {
        margin: 0 0 8px;
        font-size: 1.4rem;
      }
      .negado__texto {
        margin: 0 0 20px;
        font-size: 0.9rem;
        color: var(--on-surface);
      }
      .negado__acoes {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
      .negado__acoes a {
        text-decoration: none;
      }
    `,
  ],
})
export class AcessoNegadoComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  sair(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
