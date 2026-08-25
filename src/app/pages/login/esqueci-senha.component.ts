import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BrandingService } from '../../core/branding/branding.service';
import { mensagemDeErro } from '../../core/http/api-error';
import { AuthService } from '../../core/services/auth.service';

/**
 * Solicitação de recuperação de senha — `POST /api/wl/auth/esqueci-senha`.
 *
 * O BFF sempre devolve 200 com a mesma mensagem, exista ou não o e-mail
 * cadastrado nesta instância (mitiga enumeração de contas). Por isso esta
 * tela também não distingue os dois casos: qualquer envio bem-sucedido cai no
 * mesmo estado `sucesso`, com o texto que veio do próprio BFF.
 */
@Component({
  selector: 'app-esqueci-senha',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="login">
      <div class="login__caixa">
        <h1 class="login__titulo">{{ brand()?.nomeExibicao || 'Painel Exibidora' }}</h1>
        <p class="login__subtitulo">Recuperar senha</p>

        @if (mensagemSucesso) {
          <div class="wl-estado wl-estado--sucesso login__erro">{{ mensagemSucesso }}</div>
          <a class="wl-btn login__botao login__voltar" routerLink="/login">Voltar para o login</a>
        } @else {
          <p class="login__instrucao">
            Informe o e-mail cadastrado. Se ele pertencer a um operador desta
            instância, enviaremos um link para redefinir a senha.
          </p>

          <form [formGroup]="form" (ngSubmit)="enviar()">
            <div class="wl-campo login__campo">
              <label for="email">E-mail</label>
              <input id="email" type="email" formControlName="email" autocomplete="username" />
              @if (mostrarErro('email')) {
                <span class="wl-campo__erro">Informe um e-mail válido.</span>
              }
            </div>

            @if (erro) {
              <div class="wl-estado wl-estado--erro login__erro">{{ erro }}</div>
            }

            <button class="wl-btn login__botao" type="submit" [disabled]="enviando">
              {{ enviando ? 'Enviando…' : 'Enviar instruções' }}
            </button>

            <a class="wl-btn--link login__esqueci" routerLink="/login">Voltar para o login</a>
          </form>
        }
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
        padding: 24px;
        background: var(--paper-bg);
      }
      .login__caixa {
        width: 100%;
        max-width: 380px;
        padding: 28px;
        background: var(--white);
        border: 1px solid var(--border);
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
      .login__instrucao {
        margin: 0 0 18px;
        font-size: 0.85rem;
        color: var(--on-surface);
        line-height: 1.4;
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
      .login__voltar {
        margin-top: 14px;
        display: block;
        text-align: center;
        text-decoration: none;
      }
      .login__esqueci {
        display: block;
        margin-top: 14px;
        text-align: center;
        font-size: 0.85rem;
      }
      .login__rodape {
        margin-top: 20px;
        font-size: 0.75rem;
        color: var(--on-surface);
      }
    `,
  ],
})
export class EsqueciSenhaComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  readonly brand = inject(BrandingService).branding;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  enviando = false;
  erro: string | null = null;
  mensagemSucesso: string | null = null;

  mostrarErro(campo: 'email'): boolean {
    const controle = this.form.controls[campo];
    return controle.invalid && (controle.dirty || controle.touched);
  }

  enviar(): void {
    this.erro = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando = true;

    this.auth.esqueciSenha(this.form.getRawValue()).subscribe({
      next: (resposta) => {
        this.enviando = false;
        // O texto vem do BFF de propósito: é a mesma mensagem genérica que a
        // API devolve para e-mail existente ou não — não há um texto
        // client-side separado que pudesse divergir dela.
        this.mensagemSucesso = resposta.message;
      },
      error: (erro: unknown) => {
        this.enviando = false;
        this.erro = mensagemDeErro(erro, 'Não foi possível enviar. Tente novamente em instantes.');
      },
    });
  }
}
