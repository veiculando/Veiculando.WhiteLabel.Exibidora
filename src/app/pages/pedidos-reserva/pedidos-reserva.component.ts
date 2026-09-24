import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { mensagemDeErro } from '../../core/http/api-error';
import {
  PedidoReservaDetalhe,
  PedidoReservaItemDecisao,
  PedidoReservaListItem,
} from '../../core/models/wl.models';
import { TOM_STATUS_PEDIDO_RESERVA } from '../../core/models/wl.models';
import { PedidosReservaService } from '../../core/services/pedidos.service';
import { PaginadorComponent } from '../../shared/paginador.component';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent, AurumStatusPillTom } from '../../shared/aurum/aurum-status-pill.component';
import { AurumModalComponent } from '../../shared/aurum/aurum-modal.component';
import { AurumCodeComponent } from '../../shared/aurum/aurum-code.component';
import { PermissionService } from '../../core/auth/permission.service';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';

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
    imports: [
      CommonModule,
      PaginadorComponent,
      AurumPageHeaderComponent,
      AurumButtonComponent,
      AurumStatusPillComponent,
      AurumModalComponent,
      AurumCodeComponent,
      AurumTableComponent,
      AurumTableRowComponent,
      AurumTableCellComponent,
      AurumTableHeaderCellComponent,
    ],
    template: `
    <aurum-page-header
      titulo="Solicitações de Reserva"
      [badge]="afiliadaId ? 'Afiliada #' + afiliadaId : ''"
      subtitulo="Gestão de pedidos de reserva recebidos dos canais da WhiteLabel."
    />

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
          <table aurumTable class="aurum-table--densa">
            <thead>
              <tr aurumTableRow>
                <th aurumTableHeaderCell>Reserva</th>
                <th aurumTableHeaderCell>Anunciante</th>
                <th aurumTableHeaderCell>Agência</th>
                <th aurumTableHeaderCell>Peças</th>
                <th aurumTableHeaderCell>Data</th>
                <th aurumTableHeaderCell>Status</th>
                <th aurumTableHeaderCell>Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (pedido of pedidos; track pedido) {
                <tr aurumTableRow>
                  <td aurumTableCell class="pr-codigo">{{ pedido.codigo }}</td>
                  <td aurumTableCell class="pr-anunciante">{{ pedido.cliente || '—' }}</td>
                  <td aurumTableCell class="pr-apagado">{{ pedido.agencia || 'Venda Direta (Sem Agência)' }}</td>
                  <td aurumTableCell class="pr-forte">{{ pedido.itensCount }}</td>
                  <td aurumTableCell class="pr-apagado">{{ pedido.dataCadastro | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td aurumTableCell><aurum-status-pill [rotulo]="pedido.status" [tom]="tomStatus(pedido.status)" compacto /></td>
                  <td aurumTableCell class="acoes">
                    <aurum-button variante="wine" tamanho="xs" (click)="alternarDetalhe(pedido)">
                      <span class="aurum-ico" style="--ico: url(/assets/aurum/icon-olho.svg)"></span>
                      Detalhes
                    </aurum-button>
                    <aurum-button variante="suave" tamanho="xs" [desabilitado]="respondendo === pedido.id" (click)="responderTudo(pedido, true)">
                      Aceitar tudo
                    </aurum-button>
                    <aurum-button variante="perigo" tamanho="xs" [desabilitado]="respondendo === pedido.id" (click)="responderTudo(pedido, false)">
                      Recusar tudo
                    </aurum-button>
                  </td>
                </tr>
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

      @if (pedidoExpandido(); as pedido) {
        <aurum-modal
          [aberto]="true"
          largura="lg"
          [titulo]="'Detalhes da Reserva' + (pedido.cliente ? ' — ' + pedido.cliente : '')"
          (fechar)="alternarDetalhe(pedido)"
        >
          <p aurumModalSubtitulo class="pr-modal__codigo">
            <aurum-code>{{ pedido.codigo }}</aurum-code>
            Solicitado em {{ pedido.dataCadastro | date: 'dd/MM/yyyy HH:mm' }}
          </p>

          @if (carregandoDetalhe) {
            <div class="wl-estado wl-estado--carregando">Carregando itens…</div>
          }
          @if (detalhe; as d) {
            <div class="pr-resumo">
              <div><span>Anunciante</span><strong>{{ d.cliente || '—' }}</strong></div>
              <div><span>Agência</span><strong>{{ d.agencia || 'Venda Direta' }}</strong></div>
              <div><span>Status</span><strong>{{ d.status }}</strong></div>
              <div>
                <span>Valor total bruto</span>
                <strong class="pr-resumo__valor">{{ d.valorTotalBruto | currency: 'BRL' : 'symbol' : '1.2-2' }}</strong>
              </div>
            </div>

            <h3 class="pr-modal__secao">Itens da Reserva (Controle de Status por Peça)</h3>
            @if (d.itens.length === 0) {
              <div class="wl-estado wl-estado--vazio">Nenhum item neste pedido.</div>
            }
            @for (item of d.itens; track item) {
              <div class="pr-item">
                <div class="pr-item__texto">
                  <aurum-code>{{ item.pecaCodigo || '—' }}</aurum-code>
                  <span>Local {{ item.localCodigo || '—' }}</span>
                </div>
                <aurum-status-pill [rotulo]="item.status" [tom]="tomStatus(item.status)" compacto />
                <label class="decisao">
                  <input
                    type="checkbox"
                    [checked]="aceitaItem(item.id)"
                    [disabled]="respondendo === pedido.id"
                    (change)="alternarItem(item.id)"
                  />
                  {{ aceitaItem(item.id) ? 'Aceitar' : 'Recusar' }}
                </label>
              </div>
            }
          }

          @if (detalhe && detalhe.itens.length > 0) {
            <span aurumModalRodape class="pr-modal__resumo">
              {{ resumoDecisoes.aceitos }} aceito(s), {{ resumoDecisoes.rejeitados }} recusado(s)
            </span>
          }
          <aurum-button aurumModalRodape variante="outline" tamanho="sm" (click)="alternarDetalhe(pedido)">Fechar detalhes</aurum-button>
          @if (detalhe && detalhe.itens.length > 0) {
            <aurum-button aurumModalRodape tamanho="sm" [desabilitado]="respondendo === pedido.id" (click)="enviarResposta(pedido)">
              {{ respondendo === pedido.id ? 'Enviando…' : 'Enviar resposta' }}
            </aurum-button>
          }
        </aurum-modal>
      }
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [
        `
      .acoes {
        display: flex;
        gap: 8px;
        white-space: nowrap;
      }
      .pr-codigo {
        font-family: var(--font-mono);
        font-weight: 700;
        color: var(--primary-color);
        white-space: nowrap;
      }
      .pr-anunciante {
        font-weight: 700;
        color: var(--primary-dark);
      }
      .pr-apagado {
        color: var(--on-surface);
      }
      .pr-forte {
        font-weight: 700;
      }
      .pr-modal__codigo {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 4px 0 0;
        font-size: 0.75rem;
        color: var(--on-surface);
      }
      .pr-resumo {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
        padding: 14px;
        border-radius: 12px;
        background: var(--paper-bg);
      }
      .pr-resumo span {
        display: block;
        font-size: 0.6875rem;
        text-transform: uppercase;
        color: var(--on-surface);
      }
      .pr-resumo strong {
        font-size: 0.8125rem;
        color: var(--primary-dark);
      }
      .pr-resumo__valor {
        font-family: var(--font-display);
        font-size: 1rem !important;
      }
      .pr-modal__secao {
        margin: 20px 0 10px;
        font-size: 0.9375rem;
        font-weight: 700;
      }
      .pr-item {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
        padding: 12px 14px;
        border: 1px solid var(--line-search);
        border-radius: 12px;
        background: var(--paper-bg);
      }
      .pr-item__texto {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 4px;
        font-size: 0.78125rem;
        color: var(--on-surface);
      }
      .decisao {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.78125rem;
        font-weight: 600;
        color: var(--charcoal);
      }
      .decisao input {
        accent-color: var(--primary-color);
      }
      .pr-modal__resumo {
        margin-right: auto;
        align-self: center;
        font-size: 0.78125rem;
        color: var(--on-surface);
      }
    `,
    ],
})
export class PedidosReservaComponent implements OnInit {
  private service = inject(PedidosReservaService);

  pedidos: PedidoReservaListItem[] = [];
  detalhe: PedidoReservaDetalhe | null = null;
  expandido: string | null = null;
  readonly afiliadaId = inject(PermissionService).getAfiliadaId();

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

  tomStatus(status: string): AurumStatusPillTom {
    return TOM_STATUS_PEDIDO_RESERVA[status] ?? 'neutro';
  }

  /** O detalhe abre no modal do Figma (`416:17329`) em vez de expandir a linha. */
  pedidoExpandido(): PedidoReservaListItem | null {
    return this.expandido ? (this.pedidos.find((p) => p.codigo === this.expandido) ?? null) : null;
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
