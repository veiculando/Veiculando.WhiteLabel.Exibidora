import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { mensagemDeErro } from '../../core/http/api-error';
import {
  LocalDetalhe,
  LocalListItem,
  PecaListItem,
  STATUS_EXIBICAO_ROTULOS,
  StatusExibicao,
} from '../../core/models/wl.models';
import { LocaisService } from '../../core/services/locais.service';
import { LocalFormComponent } from './local-form.component';

/** Limite deste endpoint no BFF: `maxBytes = 10 * 1024 * 1024`. */
const LIMITE_FOTO_PECA_BYTES = 10 * 1024 * 1024;

/**
 * Locais e peças da exibidora — card `9d56ac0a`.
 *
 * O que esta tela faz, e por quê exatamente isso:
 *
 *  - **Lista** (`GET /api/wl/locais`), já filtrada por `AfiliadaId` no servidor.
 *    Por isso não existe seletor de afiliada: escolher outra não teria efeito, o
 *    `TenantMiddleware` sobrepõe o header com o `WL:AfiliadaId` da instância.
 *  - **Peças por local** (`GET /api/wl/pecas`), agrupadas no cliente.
 *  - **Foto da peça** (`POST .../foto`), com validação de tamanho antes de subir.
 *  - **Exclusão** (`DELETE /api/wl/locais/{id}`), que é soft delete no core.
 *  - **Cadastro e edição**, delegados ao `LocalFormComponent`.
 *
 * O fluxo de aprovação é transparente aqui: quem cria um local pela Exibidora o
 * recebe em `StatusExibicao = AprovacaoPendente` e a liberação acontece no
 * Admin (ADR-WL-004 revisada). Esta tela apenas **reflete** o estado — a
 * transição é aplicada pelo `LocalCadastroHandler` do core, que reconhece a
 * conta de serviço da instância como usuário de afiliada.
 */
@Component({
  selector: 'app-locais',
  standalone: true,
  imports: [CommonModule, LocalFormComponent],
  template: `
    <div class="wl-page">
      <h1 class="wl-page__titulo">Locais e peças</h1>
      <p class="wl-page__descricao">
        Pontos de exibição desta exibidora e as peças vinculadas a cada um.
      </p>

      <div class="wl-toolbar" *ngIf="!formAberto">
        <button class="wl-btn" type="button" (click)="abrirCriacao()">Novo local</button>
      </div>

      <app-local-form
        *ngIf="formAberto"
        [local]="localEmEdicao"
        (salvo)="aoSalvar($event)"
        (cancelar)="fecharForm()"
      />

      <div class="wl-estado wl-estado--carregando" *ngIf="carregando">Carregando locais…</div>

      <div class="wl-estado wl-estado--erro" *ngIf="erro">
        {{ erro }}
        <button class="wl-btn wl-btn--link" type="button" (click)="carregar()">Tentar novamente</button>
      </div>

      <div class="wl-estado wl-estado--sucesso" *ngIf="aviso">{{ aviso }}</div>

      <div class="wl-estado wl-estado--vazio" *ngIf="!carregando && !erro && locais.length === 0">
        Nenhum local cadastrado para esta exibidora.
      </div>

      <div class="wl-tabela--rolavel" *ngIf="locais.length > 0">
        <table class="wl-tabela">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Cidade</th>
              <th>UF</th>
              <th>Situação</th>
              <th>Peças</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <ng-container *ngFor="let local of locais">
              <tr>
                <td>{{ local.codigo }}</td>
                <td>{{ local.descricao }}</td>
                <td>{{ local.cidade || '—' }}</td>
                <td>{{ local.uf || '—' }}</td>
                <td>
                  <span class="wl-etiqueta" [class.wl-etiqueta--pendente]="aguardandoAprovacao(local)"
                        [class.wl-etiqueta--ativo]="!aguardandoAprovacao(local)">
                    {{ rotuloSituacao(local) }}
                  </span>
                </td>
                <td>{{ pecasDoLocal(local.id).length }}</td>
                <td class="acoes">
                  <button class="wl-btn wl-btn--link" type="button" (click)="alternar(local.id)">
                    {{ expandido === local.id ? 'Ocultar peças' : 'Ver peças' }}
                  </button>
                  <button class="wl-btn wl-btn--link" type="button" (click)="abrirEdicao(local)">
                    Editar
                  </button>
                  <button class="wl-btn wl-btn--link excluir" type="button" (click)="excluir(local)">
                    Excluir
                  </button>
                </td>
              </tr>

              <tr *ngIf="expandido === local.id">
                <td colspan="7" class="pecas">
                  <div class="wl-estado wl-estado--vazio" *ngIf="pecasDoLocal(local.id).length === 0">
                    Nenhuma peça vinculada a este local.
                  </div>

                  <table class="wl-tabela" *ngIf="pecasDoLocal(local.id).length > 0">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Formato</th>
                        <th>Valor padrão</th>
                        <th>Foto</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let peca of pecasDoLocal(local.id)">
                        <td>{{ peca.codigo }}</td>
                        <td>{{ peca.formatoDimensao || '—' }}</td>
                        <td>{{ peca.valorPadrao | currency: 'BRL' : 'symbol' : '1.2-2' }}</td>
                        <td>
                          <input
                            type="file"
                            accept="image/*"
                            [disabled]="enviandoFotoDe === peca.id"
                            (change)="enviarFoto(local, peca, $event)"
                          />
                          <span class="enviando" *ngIf="enviandoFotoDe === peca.id">enviando…</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </ng-container>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .acoes {
        display: flex;
        gap: 12px;
        white-space: nowrap;
      }
      .excluir {
        color: #b3261e;
      }
      .pecas {
        background: #faf9f6;
      }
      .enviando {
        margin-left: 8px;
        font-size: 0.75rem;
        color: var(--on-surface);
      }
    `,
  ],
})
export class LocaisComponent implements OnInit {
  private service = inject(LocaisService);

  locais: LocalListItem[] = [];
  pecas: PecaListItem[] = [];
  carregando = false;
  erro: string | null = null;
  aviso: string | null = null;
  expandido: number | null = null;
  enviandoFotoDe: number | null = null;

  formAberto = false;
  /** `null` com o formulário aberto significa criação. */
  localEmEdicao: LocalDetalhe | null = null;

  abrirCriacao(): void {
    this.localEmEdicao = null;
    this.formAberto = true;
    this.erro = null;
    this.aviso = null;
  }

  /**
   * Busca o detalhe antes de abrir a edição em vez de reaproveitar a linha da
   * listagem: o item de lista não traz endereço nem geolocalização, e o core
   * sobrescreve esses campos com o que o formulário enviar.
   */
  abrirEdicao(local: LocalListItem): void {
    this.erro = null;
    this.aviso = null;

    this.service.obter(local.id).subscribe({
      next: (detalhe) => {
        this.localEmEdicao = detalhe;
        this.formAberto = true;
      },
      error: (erro: unknown) => {
        this.erro = mensagemDeErro(erro, 'Não foi possível abrir o local para edição.');
      },
    });
  }

  fecharForm(): void {
    this.formAberto = false;
    this.localEmEdicao = null;
  }

  aoSalvar(mensagem: string): void {
    this.fecharForm();
    this.aviso = mensagem;
    this.carregar();
  }

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.erro = null;

    this.service.listar().subscribe({
      next: (locais) => {
        this.locais = locais;
        this.carregando = false;
        this.carregarPecas();
      },
      error: (erro: unknown) => {
        this.carregando = false;
        this.erro = mensagemDeErro(erro, 'Não foi possível carregar os locais.');
      },
    });
  }

  /**
   * As peças vêm em uma chamada única e são agrupadas no cliente. O BFF não tem
   * `GET /pecas?idLocal=`, e uma chamada por local geraria N requisições para
   * montar a coluna de contagem.
   */
  private carregarPecas(): void {
    this.service.listarPecas().subscribe({
      next: (pecas) => (this.pecas = pecas),
      error: () => (this.pecas = []),
    });
  }

  pecasDoLocal(idLocal: number): PecaListItem[] {
    return this.pecas.filter((p) => p.idLocal === idLocal);
  }

  alternar(idLocal: number): void {
    this.expandido = this.expandido === idLocal ? null : idLocal;
  }

  aguardandoAprovacao(local: LocalListItem): boolean {
    return local.statusExibicao === StatusExibicao.AprovacaoPendente;
  }

  rotuloSituacao(local: LocalListItem): string {
    // Um BFF que não projete `statusExibicao` só devolve locais ativos, então a
    // ausência do campo equivale a Ativo.
    const status = local.statusExibicao ?? StatusExibicao.Ativo;
    return STATUS_EXIBICAO_ROTULOS[status] ?? 'Desconhecida';
  }

  excluir(local: LocalListItem): void {
    const confirmado = confirm(
      `Excluir o local ${local.codigo}? A exclusão é lógica e pode ser revertida pela equipe Veiculando.`
    );
    if (!confirmado) return;

    this.erro = null;
    this.aviso = null;

    this.service.excluir(local.id).subscribe({
      next: () => {
        this.aviso = `Local ${local.codigo} excluído.`;
        this.carregar();
      },
      error: (erro: unknown) => {
        this.erro = mensagemDeErro(erro, 'Não foi possível excluir o local.');
      },
    });
  }

  enviarFoto(local: LocalListItem, peca: PecaListItem, evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;

    this.erro = null;
    this.aviso = null;

    // Barra o arquivo antes de subir: o servidor recusaria de qualquer forma,
    // mas sem isso o operador espera o upload inteiro para receber o 400.
    if (arquivo.size > LIMITE_FOTO_PECA_BYTES) {
      this.erro = `A foto tem ${this.emMb(arquivo.size)} MB e o limite é ${this.emMb(
        LIMITE_FOTO_PECA_BYTES
      )} MB. Escolha um arquivo menor.`;
      input.value = '';
      return;
    }

    this.enviandoFotoDe = peca.id;

    this.service.enviarFotoPeca(local.id, peca.id, arquivo).subscribe({
      next: (resposta) => {
        this.enviandoFotoDe = null;
        this.aviso = resposta.message;
        input.value = '';
      },
      error: (erro: unknown) => {
        this.enviandoFotoDe = null;
        this.erro = mensagemDeErro(erro, 'Não foi possível enviar a foto da peça.');
        input.value = '';
      },
    });
  }

  private emMb(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(1);
  }
}
