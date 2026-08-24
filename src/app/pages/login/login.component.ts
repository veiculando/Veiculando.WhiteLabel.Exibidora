
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
      <form class="login__caixa" [formGroup]="form" (ngSubmit)="entrar()">
        <h1 class="login__titulo">Painel Exibidora</h1>
        <p class="login__subtitulo">Acesso do operador</p>
    
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
        padding: 24px;
        background: var(--paper-bg);
      }
      .login__caixa {
        width: 100%;
        max-width: 380px;
        padding: 28px;
        background: var(--white);
        border: 1px solid #e1e3ea;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-base);
      }
      .login__titulo {
        margin: 0;
        font-size: 1.4rem;
      }
      .login__subtitulo {
        margin: 4px 0 20px;
        font-size: 0.85rem;
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
        padding: 10px;
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
