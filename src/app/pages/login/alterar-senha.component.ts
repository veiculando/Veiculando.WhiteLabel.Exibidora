import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BrandingService } from '../../core/branding/branding.service';
import { mensagemDeErro } from '../../core/http/api-error';
import { AuthService } from '../../core/services/auth.service';

/**
 * Conclusão da recuperação de senha — `POST /api/wl/auth/alterar-senha`.
 *
 * `email` e `token` chegam pela query string do link enviado por e-mail
 * (`AuthController.MontarLinkRedefinicao` no BFF). Ficam só em memória neste
 * componente — em nenhum momento vão para `localStorage`/`SecureStorage`
 * (que guarda o JWT de sessão, ADR-WL-007, um dado diferente deste token de
 * uso único). Um refresh da página perde os dois, e é o comportamento certo:
 * o link tem que ser reaberto do e-mail, não sobreviver em storage local.
 */
@Component({
  selector: 'app-alterar-senha',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="login">
      <div class="login__caixa">
        <h1 class="login__titulo">{{ brand()?.nomeExibicao || 'Painel Exibidora' }}</h1>
        <p class="login__subtitulo">Redefinir senha</p>

        @if (linkInvalido) {
          <div class="wl-estado wl-estado--erro login__erro">
            Link de redefinição inválido. Solicite uma nova recuperação de senha.
          </div>
          <a class="wl-btn login__botao login__voltar" routerLink="/login/esqueci-senha">Solicitar novo link</a>
        } @else if (mensagemSucesso) {
          <div class="wl-estado wl-estado--sucesso login__erro">{{ mensagemSucesso }}</div>
          <a class="wl-btn login__botao login__voltar" routerLink="/login">Ir para o login</a>
        } @else {
          <form [formGroup]="form" (ngSubmit)="enviar()">
            <div class="wl-campo login__campo">
              <label for="novaSenha">Nova senha</label>
              <input id="novaSenha" type="password" formControlName="novaSenha" autocomplete="new-password" />
              @if (mostrarErro('novaSenha')) {
                <span class="wl-campo__erro">A senha precisa ter no mínimo 8 caracteres.</span>
              }
            </div>

            <div class="wl-campo login__campo">
              <label for="confirmarSenha">Confirmar nova senha</label>
              <input id="confirmarSenha" type="password" formControlName="confirmarSenha" autocomplete="new-password" />
              @if (mostrarErroConfirmacao()) {
                <span class="wl-campo__erro">As senhas informadas não coincidem.</span>
              }
            </div>

            @if (erro) {
              <div class="wl-estado wl-estado--erro login__erro">{{ erro }}</div>
            }

            <button class="wl-btn login__botao" type="submit" [disabled]="enviando">
              {{ enviando ? 'Salvando…' : 'Redefinir senha' }}
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
export class AlterarSenhaComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  readonly brand = inject(BrandingService).branding;

  /** `null` só depois de checar a query string — nunca reescritos após isso. */
  private readonly email: string | null;
  private readonly token: string | null;

  readonly linkInvalido: boolean;

  form = this.fb.nonNullable.group(
    {
      novaSenha: ['', [Validators.required, Validators.minLength(8)]],
      confirmarSenha: ['', [Validators.required]],
    },
    { validators: [senhasIguaisValidator] }
  );

  enviando = false;
  erro: string | null = null;
  mensagemSucesso: string | null = null;

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    this.email = params.get('email');
    this.token = params.get('token');
    // Sem os dois, não há o que redefinir — a tela nem mostra o formulário.
    this.linkInvalido = !this.email || !this.token;
  }

  mostrarErro(campo: 'novaSenha'): boolean {
    const controle = this.form.controls[campo];
    return controle.invalid && (controle.dirty || controle.touched);
  }

  mostrarErroConfirmacao(): boolean {
    const controle = this.form.controls.confirmarSenha;
    const naoCoincide = this.form.hasError('senhasDiferentes');
    return naoCoincide && (controle.dirty || controle.touched);
  }

  enviar(): void {
    this.erro = null;

    if (this.form.invalid || !this.email || !this.token) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando = true;

    this.auth
      .alterarSenha({
        email: this.email,
        token: this.token,
        novaSenha: this.form.getRawValue().novaSenha,
      })
      .subscribe({
        next: (resposta) => {
          this.enviando = false;
          this.mensagemSucesso = resposta.message;
        },
        error: (erro: unknown) => {
          this.enviando = false;
          this.erro = mensagemDeErro(
            erro,
            'Link de recuperação inválido ou expirado. Solicite uma nova recuperação de senha.'
          );
        },
      });
  }
}

/** Validador de grupo: `novaSenha` e `confirmarSenha` precisam ser idênticos. */
function senhasIguaisValidator(grupo: AbstractControl): ValidationErrors | null {
  const novaSenha = grupo.get('novaSenha')?.value;
  const confirmarSenha = grupo.get('confirmarSenha')?.value;
  return novaSenha === confirmarSenha ? null : { senhasDiferentes: true };
}
