
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BrandingService } from '../../core/branding/branding.service';
import { mensagemDeErro } from '../../core/http/api-error';
import { AuthService } from '../../core/services/auth.service';

/**
 * Autenticação do operador WL — `POST /api/wl/auth/login`.
 *
 * O BFF valida a senha com BCrypt contra `WL_Usuario.SenhaHash` e emite um JWT
 * com uma claim `permission` por permissão do operador. O `AuthService` persiste
 * o token criptografado; daí em diante o `jwtInterceptor` o anexa sozinho.
 *
 * A afiliada NÃO é escolhida aqui: o `TenantMiddleware` do BFF sempre usa o
 * `WL:AfiliadaId` da própria instância como fonte de verdade e ignora o header
 * enviado pelo frontend (ADR-WL-005). Um seletor de afiliada nesta tela seria
 * decorativo e enganoso.
 */
@Component({
    selector: 'app-login',
    imports: [ReactiveFormsModule, RouterLink],
    template: `
    <div class="login">
      <div class="login__moldura">
        <section class="login__marca" aria-label="Identidade da exibidora">
          @if (brand()?.logoUrl && !logoComErro) {
            <img
              class="login__logo"
              [src]="brand()?.logoUrl"
              [alt]="'Logo ' + (brand()?.nomeExibicao ?? '')"
              (error)="logoComErro = true"
            />
          }
          <span class="login__eyebrow">Operação WhiteLabel</span>
          <h1>{{ brand()?.nomeExibicao || 'Painel Exibidora' }}</h1>
          <p>Inventário, programação e pedidos reunidos em uma única operação.</p>
        </section>

        <form class="login__caixa" [formGroup]="form" (ngSubmit)="entrar()">
          <span class="login__detalhe" aria-hidden="true"></span>
          <h2 class="login__titulo">Acesse o painel</h2>
          <p class="login__subtitulo">Entre com as credenciais do seu operador.</p>

          <div class="wl-campo login__campo">
            <label for="email">E-mail</label>
            <input id="email" type="email" formControlName="email" autocomplete="username" />
            @if (mostrarErro('email')) {
              <span class="wl-campo__erro">Informe um e-mail válido.</span>
            }
          </div>

          <div class="wl-campo login__campo">
            <label for="senha">Senha</label>
            <input id="senha" type="password" formControlName="senha" autocomplete="current-password" />
            @if (mostrarErro('senha')) {
              <span class="wl-campo__erro">Informe a senha.</span>
            }
          </div>

          @if (erro) {
            <div class="wl-estado wl-estado--erro login__erro">{{ erro }}</div>
          }

          <button class="wl-btn login__botao" type="submit" [disabled]="enviando">
            {{ enviando ? 'Entrando…' : 'Entrar' }}
          </button>

          <a class="wl-btn--link login__esqueci" routerLink="/login/esqueci-senha">Esqueci minha senha</a>
        </form>
      </div>

      <p class="login__rodape">{{ brand()?.footerText || brand()?.nomeExibicao }}</p>
    </div>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [
        `
      .login {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 32px;
        background:
          linear-gradient(120deg, color-mix(in srgb, var(--primary-color) 7%, transparent), transparent 48%),
          var(--paper-bg);
      }
      .login__moldura {
        display: grid;
        grid-template-columns: minmax(0, 1.05fr) minmax(340px, 0.95fr);
        width: min(920px, 100%);
        overflow: hidden;
        background: var(--white);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-base);
      }
      .login__marca {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        min-height: 520px;
        padding: 54px;
        color: var(--white);
        background: var(--header-footer-bg);
      }
      .login__logo {
        width: auto;
        max-width: 220px;
        height: 72px;
        margin-bottom: auto;
        object-fit: contain;
        object-position: left center;
      }
      .login__eyebrow {
        margin-bottom: 14px;
        color: var(--secondary-color);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      .login__marca h1 {
        margin: 0;
        color: var(--white);
        font-size: clamp(2.4rem, 5vw, 4rem);
        font-weight: 600;
        line-height: 0.98;
      }
      .login__marca p {
        max-width: 390px;
        margin: 20px 0 0;
        color: color-mix(in srgb, var(--white) 76%, transparent);
        font-size: 0.95rem;
      }
      .login__caixa {
        position: relative;
        align-self: center;
        padding: 54px;
        background: var(--white);
      }
      .login__detalhe {
        display: block;
        width: 52px;
        height: 3px;
        margin-bottom: 28px;
        background: var(--secondary-color);
      }
      .login__titulo {
        margin: 0;
        font-size: 2rem;
        font-weight: 600;
      }
      .login__subtitulo {
        margin: 6px 0 28px;
        font-size: 0.9rem;
        color: var(--on-surface);
      }
      .login__campo {
        min-width: 0;
        margin-bottom: 14px;
      }
      .login__erro {
        margin-bottom: 14px;
      }
      .login__botao {
        width: 100%;
        padding: 11px;
      }
      .login__rodape {
        margin-top: 20px;
        font-size: 0.75rem;
        color: var(--on-surface);
      }
      .login__esqueci {
        display: block;
        margin-top: 14px;
        text-align: center;
        font-size: 0.85rem;
      }
      @media (max-width: 760px) {
        .login {
          padding: 16px;
        }
        .login__moldura {
          grid-template-columns: 1fr;
        }
        .login__marca {
          min-height: 280px;
          padding: 32px;
        }
        .login__logo {
          height: 56px;
          margin-bottom: 44px;
        }
        .login__caixa {
          padding: 36px 32px;
        }
      }
    `,
    ]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly brand = inject(BrandingService).branding;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]],
  });

  enviando = false;
  erro: string | null = null;
  logoComErro = false;

  mostrarErro(campo: 'email' | 'senha'): boolean {
    const controle = this.form.controls[campo];
    return controle.invalid && (controle.dirty || controle.touched);
  }

  entrar(): void {
    this.erro = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando = true;

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.enviando = false;
        this.router.navigate(['/dashboard']);
      },
      error: (erro: unknown) => {
        this.enviando = false;
        this.erro = mensagemDeErro(erro, 'Não foi possível entrar. Tente novamente.');
      },
    });
  }
}
