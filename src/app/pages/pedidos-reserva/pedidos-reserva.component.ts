import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { mensagemDeErro } from '../../core/http/api-error';
import {
  PedidoReservaDetalhe,
  PedidoReservaItemDecisao,
  PedidoReservaListItem,
} from '../../core/models/wl.models';
import { PedidosReservaService } from '../../core/services/pedidos.service';
import { PaginadorComponent } from '../../shared/paginador.component';

/**
 * Pedidos de reserva — card `67d92ac5`.
 *
 * Lista as solicitações da exibidora com a coluna **Agência** (que o BFF resolve
 * por `Pedido.Campanha.Agencia`) e permite aceitar ou rejeitar.
 *
 * **Resposta é por item.** O contrato do BFF passou a exigir uma decisão para
 * cada item pendente do pedido — nem a mais, nem a menos. Omitir um item o
 * deixaria pendente para sempre com o pedido já marcado como respondido, e o
 * servidor recusa o payload incompleto. Por isso a tela abre o detalhe antes de
 * responder: sem os itens carregados não há o que enviar.
 *
 * O botão de aceitar/recusar tudo continua existindo como atalho, mas ele monta
 * a mesma lista item a item — não há caminho que envie menos que o conjunto
 * completo.
 */
@Component({
    selector: 'app-pedidos-reserva',
    imports: [CommonModule, PaginadorComponent],
    template: `
    <div class="wl-page">
      <h1 class="wl-page__titulo">Pedidos de reserva</h1>
      <p class="wl-page__descricao">Solicitações de reserva de inventário desta exibidora.</p>
    
      @if (erro) {
        <div class="wl-estado wl-estado--erro">{{ erro }}</div>
      }
      @if (aviso) {
        <div class="wl-estado wl-estado--sucesso">{{ aviso }}</div>
      }
    
      @if (carregando) {
        <div class="wl-estado wl-estado--carregando">Carregando pedidos…</div>
      }
    
      @if (!carregando && !erro && pedidos.length === 0) {
        <div class="wl-estado wl-estado--vazio">
          Nenhum pedido de reserva recebido.
        </div>
      }
    
      @if (pedidos.length > 0) {
        <div class="wl-tabela--rolavel">
          <table class="wl-tabela">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Agência</th>
                <th>Anunciante</th>
                <th>Recebido em</th>
                <th>Itens</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (pedido of pedidos; track pedido) {
                <tr>
                  <td>{{ pedido.codigo }}</td>
                  <td>{{ pedido.agencia || '—' }}</td>
                  <td>{{ pedido.cliente || '—' }}</td>
                  <td>{{ pedido.dataCadastro | date: 'dd/MM/yyyy' }}</td>
                  <td>{{ pedido.itensCount }}</td>
                  <td><span class="wl-etiqueta">{{ pedido.status }}</span></td>
                  <td class="acoes">
                    <button class="wl-btn wl-btn--link" type="button" (click)="alternarDetalhe(pedido)">
                      {{ expandido === pedido.codigo ? 'Ocultar' : 'Detalhe' }}
                    </button>
                    <button
                      class="wl-btn wl-btn--link"
                      type="button"
                      [disabled]="respondendo === pedido.id"
                      (click)="responderTudo(pedido, true)"
                      >
                      Aceitar tudo
                    </button>
                    <button
                      class="wl-btn wl-btn--link rejeitar"
                      type="button"
                      [disabled]="respondendo === pedido.id"
                      (click)="responderTudo(pedido, false)"
                      >
                      Recusar tudo
                    </button>
                  </td>
                </tr>
                @if (expandido === pedido.codigo) {
                  <tr>
                    <td colspan="7" class="detalhe">
                      @if (carregandoDetalhe) {
                        <div class="wl-estado wl-estado--carregando">
                          Carregando itens…
                        </div>
                      }
                      @if (detalhe; as d) {
                        <p class="detalhe__valor">
                          Valor total bruto:
                          <strong>{{ d.valorTotalBruto | currency: 'BRL' : 'symbol' : '1.2-2' }}</strong>
                        </p>
                        @if (d.itens.length === 0) {
                          <div class="wl-estado wl-estado--vazio">
                            Nenhum item neste pedido.
                          </div>
                        }
                        @if (d.itens.length > 0) {
                          <table class="wl-tabela">
                            <thead>
                              <tr>
                                <th>Local</th>
                                <th>Peça</th>
                                <th>Status</th>
                                <th>Decisão</th>
                              </tr>
                            </thead>
                            <tbody>
                              @for (item of d.itens; track item) {
                                <tr>
                                  <td>{{ item.localCodigo || '—' }}</td>
                                  <td>{{ item.pecaCodigo || '—' }}</td>
                                  <td>{{ item.status }}</td>
                                  <td>
                                    <label class="decisao">
                                      <input
                                        type="checkbox"
                                        [checked]="aceitaItem(item.id)"
                                        [disabled]="respondendo === pedido.id"
                                        (change)="alternarItem(item.id)"
                                      />
                                      {{ aceitaItem(item.id) ? 'Aceitar' : 'Recusar' }}
                                    </label>
                                  </td>
                                </tr>
                              }
                            </tbody>
                          </table>

                          <div class="detalhe__acoes">
                            <span class="detalhe__resumo">
                              {{ resumoDecisoes.aceitos }} aceito(s),
                              {{ resumoDecisoes.rejeitados }} recusado(s)
                            </span>
                            <button
                              class="wl-btn"
                              type="button"
                              [disabled]="respondendo === pedido.id"
                              (click)="enviarResposta(pedido)"
                            >
                              {{ respondendo === pedido.id ? 'Enviando…' : 'Enviar resposta' }}
                            </button>
                          </div>
                        }
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <app-paginador
          [page]="page"
          [pageSize]="pageSize"
          [total]="total"
          [totalPaginas]="totalPaginas"
          [carregando]="carregando"
          (pagina)="carregar($event)"
        />
      }
    </div>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [
        `
      .acoes {
        display: flex;
        gap: 12px;
        white-space: nowrap;
      }
      .rejeitar {
        color: var(--danger);
      }
      .detalhe {
        background: var(--surface-muted);
      }
      .detalhe__valor {
        margin: 0 0 12px;
        font-size: 0.875rem;
      }
      .detalhe__acoes {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 12px;
      }
      .detalhe__resumo {
        font-size: 0.875rem;
      }
      .decisao {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
      }
    `,
    ]
})
export class PedidosReservaComponent implements OnInit {
  private service = inject(PedidosReservaService);

  pedidos: PedidoReservaListItem[] = [];
  detalhe: PedidoReservaDetalhe | null = null;
  expandido: string | null = null;

  carregando = false;
  carregandoDetalhe = false;
  respondendo: number | null = null;
  erro: string | null = null;
  aviso: string | null = null;

  /** Decisao por item, chaveada por `id` do item. Preenchida ao abrir o detalhe. */
  decisoes = new Map<number, boolean>();

  page = 1;
  pageSize = 25;
  total = 0;
  totalPaginas = 0;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(page = this.page): void {
    this.carregando = true;
    this.erro = null;

    this.service.listar({ page, pageSize: this.pageSize }).subscribe({
      next: (pagina) => {
        this.pedidos = pagina.itens;
        this.page = pagina.page;
        this.pageSize = pagina.pageSize;
        this.total = pagina.total;
        this.totalPaginas = pagina.totalPaginas;
        this.carregando = false;
      },
      error: (erro: unknown) => {
        this.carregando = false;
        this.pedidos = [];
        this.erro = mensagemDeErro(erro, 'Não foi possível carregar os pedidos de reserva.');
      },
    });
  }

  alternarDetalhe(pedido: PedidoReservaListItem): void {
    if (this.expandido === pedido.codigo) {
      this.expandido = null;
      this.detalhe = null;
      this.decisoes.clear();
      return;
    }

    this.expandido = pedido.codigo;
    this.detalhe = null;
    this.decisoes.clear();
    this.carregandoDetalhe = true;

    this.service.obter(pedido.codigo).subscribe({
      next: (detalhe) => {
        this.detalhe = detalhe;
        // Default aceitar: o operador ajusta so o que vai recusar. Toda decisao
        // nasce preenchida porque o servidor exige o conjunto completo.
        this.decisoes = new Map(detalhe.itens.map((i) => [i.id, true]));
        this.carregandoDetalhe = false;
      },
      error: (erro: unknown) => {
        this.carregandoDetalhe = false;
        this.erro = mensagemDeErro(erro, 'Não foi possível carregar o detalhe do pedido.');
      },
    });
  }

  /** Marca/desmarca a aceitacao de um item no detalhe aberto. */
  alternarItem(idItem: number): void {
    this.decisoes.set(idItem, !this.decisoes.get(idItem));
  }

  aceitaItem(idItem: number): boolean {
    return this.decisoes.get(idItem) === true;
  }

  get resumoDecisoes(): { aceitos: number; rejeitados: number } {
    let aceitos = 0;
    for (const aceito of this.decisoes.values()) if (aceito) aceitos++;
    return { aceitos, rejeitados: this.decisoes.size - aceitos };
  }

  /**
   * Atalho de "aceitar tudo" / "recusar tudo".
   *
   * Nao e um caminho alternativo no servidor: monta a mesma lista item a item
   * que o envio manual monta. O contrato do BFF so conhece uma forma.
   */
  responderTudo(pedido: PedidoReservaListItem, aceitar: boolean): void {
    if (this.expandido !== pedido.codigo || !this.detalhe) {
      // Sem o detalhe carregado nao ha ids de item, e o servidor recusa resposta
      // incompleta. Abrir o detalhe e o passo que falta.
      this.alternarDetalhe(pedido);
      this.aviso = null;
      this.erro = 'Abra o detalhe do pedido para responder os itens.';
      return;
    }

    for (const item of this.detalhe.itens) this.decisoes.set(item.id, aceitar);
    this.enviarResposta(pedido);
  }

  enviarResposta(pedido: PedidoReservaListItem): void {
    if (!this.detalhe) return;

    const itens: PedidoReservaItemDecisao[] = this.detalhe.itens.map((item) => ({
      idItemPedidoReserva: item.id,
      aceitar: this.aceitaItem(item.id),
    }));

    if (itens.length === 0) return;

    const { aceitos, rejeitados } = this.resumoDecisoes;
    const descricao =
      rejeitados === 0
        ? `aceitar os ${aceitos} item(ns)`
        : aceitos === 0
          ? `recusar os ${rejeitados} item(ns)`
          : `aceitar ${aceitos} e recusar ${rejeitados} item(ns)`;

    if (!confirm(`Confirma ${descricao} do pedido ${pedido.codigo}?`)) return;

    this.erro = null;
    this.aviso = null;
    this.respondendo = pedido.id;

    this.service.responder(pedido.id, itens).subscribe({
      next: (resposta) => {
        this.respondendo = null;
        this.aviso = resposta.message;
        this.expandido = null;
        this.detalhe = null;
        this.decisoes.clear();
        this.carregar();
      },
      error: (erro: unknown) => {
        this.respondendo = null;
        this.erro = mensagemDeErro(erro, 'Não foi possível responder o pedido.');
      },
    });
  }
}
