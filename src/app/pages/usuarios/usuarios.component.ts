import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { mensagemDeErro } from '../../core/http/api-error';
import {
  PERMISSOES_WL,
  PERMISSOES_WL_ROTULOS,
  PermissaoWl,
  UsuarioWl,
} from '../../core/models/wl.models';
import { UsuariosService } from '../../core/services/usuarios.service';

/**
 * Operadores da exibidora — card `6c8ee49a`.
 *
 * CRUD sobre `WL_UsuarioAfiliada`, que existe em produção desde o TP-R1
 * (migration `CriacaoWlUsuarioTPT`).
 *
 * Sobre os toggles de permissão: os cinco identificadores vêm de
 * `PERMISSOES_WL`, que espelha a whitelist `WlPermissoesValidas` do domínio.
 * A validação real é do servidor — qualquer valor fora da lista volta 400 com
 * as permissões inválidas nomeadas. A lista aqui é para o operador não precisar
 * digitar identificadores.
 *
 * A edição altera dados cadastrais, permissões e senha. Nem sempre foi assim: o
 * `Update` do BFF aceitava nome, cargo, departamento, telefone e senha no DTO
 * mas aplicava só `AtualizarPermissoes`, descartando o resto sem erro — o
 * operador salvava e o dado voltava como antes. Corrigido ainda na Sprint 9.0,
 * junto com o formulário completo desta tela.
 *
 * A atualização é parcial por campo: o que não vier no payload é preservado no
 * servidor. Por isso a senha só viaja quando preenchida — string vazia seria
 * lida como tentativa de troca.
 *
 * O e-mail é imutável: identifica o operador na instância e faz parte do índice
 * único `UK_WlUsuario_Email_Afiliada`.
 */
@Component({
    selector: 'app-usuarios',
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="wl-page">
      <h1 class="wl-page__titulo">Operadores da exibidora</h1>
      <p class="wl-page__descricao">Contas de acesso ao painel e suas permissões.</p>
    
      @if (erro) {
        <div class="wl-estado wl-estado--erro">{{ erro }}</div>
      }
      @if (aviso) {
        <div class="wl-estado wl-estado--sucesso">{{ aviso }}</div>
      }
    
      <div class="wl-toolbar">
        @if (!criando) {
          <button class="wl-btn" type="button" (click)="abrirCriacao()">
            Novo operador
          </button>
        }
      </div>
    
      <!-- --------------------------------------------- Criação -->
      @if (criando) {
        <form class="wl-card" [formGroup]="formCriacao" (ngSubmit)="criar()">
          <h2 class="cartao__titulo">Novo operador</h2>
          <div class="grade">
            <div class="wl-campo">
              <label for="nome">Nome *</label>
              <input id="nome" type="text" formControlName="nome" />
              @if (invalido('nome')) {
                <span class="wl-campo__erro">Informe o nome.</span>
              }
            </div>
            <div class="wl-campo">
              <label for="email">E-mail *</label>
              <input id="email" type="email" formControlName="email" />
              @if (invalido('email')) {
                <span class="wl-campo__erro">Informe um e-mail válido.</span>
              }
            </div>
            <div class="wl-campo">
              <label for="senha">Senha *</label>
              <input id="senha" type="password" formControlName="senha" autocomplete="new-password" />
              @if (invalido('senha')) {
                <span class="wl-campo__erro">Mínimo de 8 caracteres.</span>
              }
            </div>
            <div class="wl-campo">
              <label for="cargo">Cargo</label>
              <input id="cargo" type="text" formControlName="cargo" />
            </div>
            <div class="wl-campo">
              <label for="departamento">Departamento</label>
              <input id="departamento" type="text" formControlName="departamento" />
            </div>
            <div class="wl-campo">
              <label for="telefone">Telefone comercial</label>
              <input id="telefone" type="text" formControlName="telefoneComercial" />
            </div>
          </div>
          <fieldset class="permissoes">
            <legend>Permissões</legend>
            @for (permissao of permissoes; track permissao) {
              <label class="permissao">
                <input
                  type="checkbox"
                  [checked]="permissoesNovas.has(permissao)"
                  (change)="alternarPermissaoNova(permissao)"
                  />
                  <span>{{ rotulo(permissao) }}</span>
                  <code>{{ permissao }}</code>
                </label>
              }
            </fieldset>
            <div class="acoes-form">
              <button class="wl-btn" type="submit" [disabled]="salvando">
                {{ salvando ? 'Salvando…' : 'Cadastrar' }}
              </button>
              <button class="wl-btn wl-btn--secundario" type="button" (click)="cancelarCriacao()">
                Cancelar
              </button>
            </div>
          </form>
        }
    
        <!-- --------------------------------------------- Listagem -->
        @if (carregando) {
          <div class="wl-estado wl-estado--carregando">Carregando operadores…</div>
        }
    
        @if (!carregando && !erro && usuarios.length === 0) {
          <div class="wl-estado wl-estado--vazio">
            Nenhum operador cadastrado.
          </div>
        }
    
        @if (usuarios.length > 0) {
          <div class="wl-tabela--rolavel">
            <table class="wl-tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Cargo</th>
                  <th>Último acesso</th>
                  <th>Permissões</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (usuario of usuarios; track usuario) {
                  <tr>
                    <td>{{ usuario.nome }}</td>
                    <td>{{ usuario.email }}</td>
                    <td>{{ usuario.cargo || '—' }}</td>
                    <td>
                      {{ usuario.dataUltimoLogin ? (usuario.dataUltimoLogin | date: 'dd/MM/yyyy HH:mm') : 'nunca' }}
                    </td>
                    <td>
                      @for (p of usuario.permissoes; track p) {
                        <span class="wl-etiqueta">{{ rotulo(p) }}</span>
                      }
                      @if (usuario.permissoes.length === 0) {
                        <span class="sem-permissao">
                          sem permissões
                        </span>
                      }
                    </td>
                    <td class="acoes">
                      <button class="wl-btn wl-btn--link" type="button" (click)="abrirEdicao(usuario)">
                        {{ editando === usuario.id ? 'Fechar' : 'Editar' }}
                      </button>
                      <button class="wl-btn wl-btn--link excluir" type="button" (click)="excluir(usuario)">
                        Excluir
                      </button>
                    </td>
                  </tr>
                  @if (editando === usuario.id) {
                    <tr>
                      <td colspan="6" class="edicao">
                        <form [formGroup]="formEdicao">
                          <div class="grade">
                            <div class="wl-campo">
                              <label [attr.for]="'nome-' + usuario.id">Nome *</label>
                              <input [id]="'nome-' + usuario.id" type="text" formControlName="nome" />
                              @if (invalidoEdicao('nome')) {
                                <span class="wl-campo__erro">Informe o nome.</span>
                              }
                            </div>
                            <div class="wl-campo">
                              <label [attr.for]="'cargo-' + usuario.id">Cargo</label>
                              <input [id]="'cargo-' + usuario.id" type="text" formControlName="cargo" />
                            </div>
                            <div class="wl-campo">
                              <label [attr.for]="'depto-' + usuario.id">Departamento</label>
                              <input [id]="'depto-' + usuario.id" type="text" formControlName="departamento" />
                            </div>
                            <div class="wl-campo">
                              <label [attr.for]="'tel-' + usuario.id">Telefone comercial</label>
                              <input [id]="'tel-' + usuario.id" type="text" formControlName="telefoneComercial" />
                            </div>
                            <div class="wl-campo">
                              <label [attr.for]="'senha-' + usuario.id">Nova senha</label>
                              <input
                                [id]="'senha-' + usuario.id"
                                type="password"
                                formControlName="senha"
                                autocomplete="new-password"
                                placeholder="deixe em branco para manter"
                                />
                                @if (invalidoEdicao('senha')) {
                                  <span class="wl-campo__erro">
                                    Mínimo de 8 caracteres.
                                  </span>
                                }
                              </div>
                            </div>
                          </form>
                          <p class="edicao__nota">
                            O e-mail não é alterável — ele identifica o operador na
                            instância. Para trocá-lo, exclua este operador e cadastre um
                            novo com o outro e-mail; o e-mail do excluído fica reservado
                            e não pode ser reaproveitado.
                          </p>
                          <fieldset class="permissoes">
                            <legend>Permissões de {{ usuario.nome }}</legend>
                            @for (permissao of permissoes; track permissao) {
                              <label class="permissao">
                                <input
                                  type="checkbox"
                                  [checked]="permissoesEdicao.has(permissao)"
                                  (change)="alternarPermissaoEdicao(permissao)"
                                  />
                                  <span>{{ rotulo(permissao) }}</span>
                                  <code>{{ permissao }}</code>
                                </label>
                              }
                            </fieldset>
                            <div class="acoes-form">
                              <button class="wl-btn" type="button" [disabled]="salvando" (click)="salvarEdicao(usuario)">
                                {{ salvando ? 'Salvando…' : 'Salvar alterações' }}
                              </button>
                            </div>
                          </td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [
        `
      .cartao__titulo {
        margin: 0 0 16px;
        font-size: 1.1rem;
      }
      .grade {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;
        margin-bottom: 16px;
      }
      .permissoes {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 12px 16px;
        margin: 0 0 16px;
      }
      .permissoes legend {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: var(--on-surface);
        padding: 0 6px;
      }
      .permissao {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
        font-size: 0.875rem;
      }
      .permissao code {
        font-size: 0.72rem;
        color: var(--on-surface);
      }
      .acoes-form {
        display: flex;
        gap: 12px;
      }
      .acoes {
        display: flex;
        gap: 12px;
        white-space: nowrap;
      }
      .excluir {
        color: var(--danger);
      }
      .edicao {
        background: var(--surface-muted);
      }
      .edicao__nota {
        margin: 0 0 12px;
        font-size: 0.8rem;
        font-style: italic;
        color: var(--on-surface);
      }
      .sem-permissao {
        font-size: 0.8rem;
        font-style: italic;
        color: var(--on-surface);
      }
      td .wl-etiqueta {
        margin: 0 4px 4px 0;
      }
    `,
    ]
})
export class UsuariosComponent implements OnInit {
  private service = inject(UsuariosService);
  private fb = inject(FormBuilder);

  readonly permissoes = PERMISSOES_WL;

  usuarios: UsuarioWl[] = [];
  carregando = false;
  salvando = false;
  erro: string | null = null;
  aviso: string | null = null;

  criando = false;
  editando: number | null = null;

  permissoesNovas = new Set<string>();
  permissoesEdicao = new Set<string>();

  formCriacao = this.fb.nonNullable.group({
    nome: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(8)]],
    cargo: [''],
    departamento: [''],
    telefoneComercial: [''],
  });

  /**
   * Edição. A senha é opcional — sem `Validators.required` — mas, se preenchida,
   * respeita o mesmo mínimo do cadastro, que o BFF também valida.
   */
  formEdicao = this.fb.nonNullable.group({
    nome: ['', [Validators.required]],
    cargo: [''],
    departamento: [''],
    telefoneComercial: [''],
    senha: ['', [Validators.minLength(8)]],
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.erro = null;

    this.service.listar().subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios;
        this.carregando = false;
      },
      error: (erro: unknown) => {
        this.carregando = false;
        this.erro = mensagemDeErro(erro, 'Não foi possível carregar os operadores.');
      },
    });
  }

  rotulo(permissao: string): string {
    return PERMISSOES_WL_ROTULOS[permissao as PermissaoWl] ?? permissao;
  }

  invalido(campo: 'nome' | 'email' | 'senha'): boolean {
    const controle = this.formCriacao.controls[campo];
    return controle.invalid && (controle.dirty || controle.touched);
  }

  // ------------------------------------------------------------ criação

  abrirCriacao(): void {
    this.criando = true;
    this.editando = null;
    this.erro = null;
    this.aviso = null;
    this.formCriacao.reset();
    this.permissoesNovas.clear();
  }

  cancelarCriacao(): void {
    this.criando = false;
    this.formCriacao.reset();
    this.permissoesNovas.clear();
  }

  alternarPermissaoNova(permissao: string): void {
    this.alternar(this.permissoesNovas, permissao);
  }

  criar(): void {
    this.erro = null;
    this.aviso = null;

    if (this.formCriacao.invalid) {
      this.formCriacao.markAllAsTouched();
      return;
    }

    this.salvando = true;
    const valores = this.formCriacao.getRawValue();

    this.service
      .criar({
        nome: valores.nome,
        email: valores.email,
        senha: valores.senha,
        cargo: valores.cargo || null,
        departamento: valores.departamento || null,
        telefoneComercial: valores.telefoneComercial || null,
        permissoes: [...this.permissoesNovas],
      })
      .subscribe({
        next: (resposta) => {
          this.salvando = false;
          this.cancelarCriacao();
          this.criando = false;
          this.aviso = resposta.message;
          this.carregar();
        },
        error: (erro: unknown) => {
          this.salvando = false;
          this.erro = mensagemDeErro(erro, 'Não foi possível cadastrar o operador.');
        },
      });
  }

  // ------------------------------------------------------------ edição

  abrirEdicao(usuario: UsuarioWl): void {
    if (this.editando === usuario.id) {
      this.editando = null;
      return;
    }

    this.editando = usuario.id;
    this.criando = false;
    this.erro = null;
    this.aviso = null;
    this.permissoesEdicao = new Set(usuario.permissoes);

    // A senha começa vazia e assim permanece se o administrador não quiser
    // trocá-la — o BFF preserva a atual quando o campo não vem preenchido.
    this.formEdicao.reset({
      nome: usuario.nome ?? '',
      cargo: usuario.cargo ?? '',
      departamento: usuario.departamento ?? '',
      telefoneComercial: usuario.telefoneComercial ?? '',
      senha: '',
    });
  }

  alternarPermissaoEdicao(permissao: string): void {
    this.alternar(this.permissoesEdicao, permissao);
  }

  invalidoEdicao(campo: string): boolean {
    const controle = this.formEdicao.get(campo);
    return !!controle && controle.invalid && (controle.dirty || controle.touched);
  }

  salvarEdicao(usuario: UsuarioWl): void {
    this.erro = null;
    this.aviso = null;

    if (this.formEdicao.invalid) {
      this.formEdicao.markAllAsTouched();
      return;
    }

    const v = this.formEdicao.getRawValue();
    this.salvando = true;

    this.service
      .atualizar(usuario.id, {
        nome: v.nome,
        cargo: v.cargo || null,
        departamento: v.departamento || null,
        telefoneComercial: v.telefoneComercial || null,
        // Só viaja quando preenchida: enviar string vazia faria o servidor
        // tratar como tentativa de troca.
        ...(v.senha ? { senha: v.senha } : {}),
        permissoes: [...this.permissoesEdicao],
      })
      .subscribe({
        next: (resposta) => {
          this.salvando = false;
          this.editando = null;
          this.aviso = resposta.message;
          this.carregar();
        },
        error: (erro: unknown) => {
          this.salvando = false;
          this.erro = mensagemDeErro(erro, 'Não foi possível atualizar o operador.');
        },
      });
  }

  // ------------------------------------------------------------ exclusão

  excluir(usuario: UsuarioWl): void {
    if (!confirm(`Excluir o operador ${usuario.email}? Ele perde o acesso ao painel imediatamente.`)) {
      return;
    }

    this.erro = null;
    this.aviso = null;

    this.service.excluir(usuario.id).subscribe({
      next: () => {
        this.aviso = `Operador ${usuario.email} excluído.`;
        this.carregar();
      },
      error: (erro: unknown) => {
        this.erro = mensagemDeErro(erro, 'Não foi possível excluir o operador.');
      },
    });
  }

  private alternar(conjunto: Set<string>, permissao: string): void {
    if (conjunto.has(permissao)) {
      conjunto.delete(permissao);
    } else {
      conjunto.add(permissao);
    }
  }
}
