import { Component, inject, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';

import { PermissionService } from '../core/auth/permission.service';
import { AuthService } from '../core/services/auth.service';

/**
 * Header da Exibidora — nó `210:4144` do Figma Aurum: faixa papel com o chip
 * do operador (iniciais em ouro, nome e cargo) e o sino à direita. Marca e
 * "Sair" ficam na sidebar (`421:28546`).
 *
 * O nome sai do token na hora e é trocado pelo de `/auth/me` quando chega,
 * junto com o cargo. Ainda não há API de notificações: o sino aparece sem o
 * ponto indicador e sem ação (test plan `cec4eea1`, BE-3).
 */
@Component({
  selector: 'app-header',
  imports: [],
  template: `
    <header class="header">
      <div class="header__operador">
        <span class="header__avatar" aria-hidden="true">{{ iniciais() }}</span>
        <span class="header__identidade">
          <span class="header__nome">{{ nome() }}</span>
          @if (cargo()) {
            <span class="header__cargo">{{ cargo() }}</span>
          }
        </span>
      </div>
      <span class="header__sino" aria-hidden="true"></span>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .header {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 40px;
        min-height: 86px;
        padding: 26px 32px;
        background: var(--paper-bg);
        filter: drop-shadow(0 4px 2px rgba(0, 0, 0, 0.07));
        position: relative;
        z-index: 10;
      }
      .header__operador {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 7px 16px 7px 9px;
        border-radius: 39px;
        background: var(--white);
        filter: drop-shadow(0 4px 2px rgba(0, 0, 0, 0.12));
      }
      .header__avatar {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: var(--gold-grad);
        color: var(--primary-dark);
        font-size: 0.8125rem;
        font-weight: 700;
      }
      .header__identidade {
        display: flex;
        flex-direction: column;
        color: var(--primary-dark);
      }
      .header__nome {
        font-size: 0.78125rem;
        font-weight: 600;
        line-height: 15px;
        white-space: nowrap;
      }
      .header__cargo {
        font-size: 0.65625rem;
        line-height: 12.6px;
        white-space: nowrap;
      }
      .header__sino {
        width: 19px;
        height: 19px;
        background: var(--primary-dark);
        -webkit-mask: url(/assets/aurum/icon-sino.svg) center / contain no-repeat;
        mask: url(/assets/aurum/icon-sino.svg) center / contain no-repeat;
      }
      @media (max-width: 640px) {
        .header {
          padding: 16px;
        }
        .header__identidade {
          display: none;
        }
      }
    `,
  ],
})
export class HeaderComponent implements OnInit {
  private permissionService = inject(PermissionService);
  private authService = inject(AuthService);

  readonly nome = signal(this.permissionService.getOperatorName());
  readonly cargo = signal<string | null>(null);

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (operador) => {
        if (operador.nome) this.nome.set(operador.nome);
        this.cargo.set(operador.cargo);
      },
      // Sem /me o chip continua com o nome do token — nada a mostrar ao operador.
      error: () => undefined,
    });
  }

  iniciais(): string {
    const partes = this.nome().trim().split(/\s+/).filter(Boolean);
    const primeira = partes[0]?.[0] ?? '';
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
  }
}
