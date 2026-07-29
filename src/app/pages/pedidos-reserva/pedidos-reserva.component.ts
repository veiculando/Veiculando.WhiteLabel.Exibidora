import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { mensagemDeErro } from '../../core/http/api-error';
import { PedidoReservaDetalhe, PedidoReservaListItem } from '../../core/models/wl.models';
import { PedidosReservaService } from '../../core/services/pedidos.service';

/**
 * Pedidos de reserva — card `67d92ac5`.
 *
 * Lista as solicitações da exibidora com a coluna **Agência** (que o BFF resolve
 * por `Pedido.Campanha.Agencia`) e permite aceitar ou rejeitar.
 *
 * **Rejeição não pede motivo.** O `PedidoReservaRespostaDto` do BFF tem apenas
 * `{ pedidoReservaId, aceitar }` — igual ao legado. Um campo de motivo na UI
 * seria descartado no serializador, então ele não existe aqui.
 */
@Component({
  selector: 'app-pedidos-reserva',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wl-page">
      <h1 class="wl-page__titulo">Pedidos de reserva</h1>
      <p class="wl-page__descricao">Solicitações de reserva de inventário desta exibidora.</p>

      <div class="wl-estado wl-estado--erro" *ngIf="erro">{{ erro }}</div>
      <div class="wl-estado wl-estado--sucesso" *ngIf="aviso">{{ aviso }}</div>

      <div class="wl-estado wl-estado--carregando" *ngIf="carregando">Carregando pedidos…</div>

      <div class="wl-estado wl-estado--vazio" *ngIf="!carregando && !erro && pedidos.length === 0">
        Nenhum pedido de reserva recebido.
      </div>

      <div class="wl-tabela--rolavel" *ngIf="pedidos.length > 0">
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
            <ng-container *ngFor="let pedido of pedidos">
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
                    (click)="responder(pedido, true)"
                  >
                    Aceitar
                  </button>
                  <button
                    class="wl-btn wl-btn--link rejeitar"
                    type="button"
                    [disabled]="respondendo === pedido.id"
                    (click)="responder(pedido, false)"
                  >
                    Rejeitar
                  </button>
                </td>
              </tr>

              <tr *ngIf="expandido === pedido.codigo">
                <td colspan="7" class="detalhe">
                  <div class="wl-estado wl-estado--carregando" *ngIf="carregandoDetalhe">
                    Carregando itens…
                  </div>

                  <ng-container *ngIf="detalhe as d">
                    <p class="detalhe__valor">
                      Valor total bruto:
                      <strong>{{ d.valorTotalBruto | currency: 'BRL' : 'symbol' : '1.2-2' }}</strong>
                    </p>

                    <div class="wl-estado wl-estado--vazio" *ngIf="d.itens.length === 0">
                      Nenhum item neste pedido.
                    </div>

                    <table class="wl-tabela" *ngIf="d.itens.length > 0">
                      <thead>
                        <tr>
                          <th>Local</th>
                          <th>Peça</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr *ngFor="let item of d.itens">
                          <td>{{ item.localCodigo || '—' }}</td>
                          <td>{{ item.pecaCodigo || '—' }}</td>
                          <td>{{ item.status }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </ng-container>
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
      .rejeitar {
        color: #b3261e;
      }
      .detalhe {
        background: #faf9f6;
      }
      .detalhe__valor {
        margin: 0 0 12px;
        font-size: 0.875rem;
      }
    `,
  ],
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

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.erro = null;

    this.service.listar().subscribe({
      next: (pedidos) => {
        this.pedidos = pedidos;
        this.carregando = false;
      },
      error: (erro: unknown) => {
        this.carregando = false;
        this.erro = mensagemDeErro(erro, 'Não foi possível carregar os pedidos de reserva.');
      },
    });
  }

  alternarDetalhe(pedido: PedidoReservaListItem): void {
    if (this.expandido === pedido.codigo) {
      this.expandido = null;
      this.detalhe = null;
      return;
    }

    this.expandido = pedido.codigo;
    this.detalhe = null;
    this.carregandoDetalhe = true;

    this.service.obter(pedido.codigo).subscribe({
      next: (detalhe) => {
        this.detalhe = detalhe;
        this.carregandoDetalhe = false;
      },
      error: (erro: unknown) => {
        this.carregandoDetalhe = false;
        this.erro = mensagemDeErro(erro, 'Não foi possível carregar o detalhe do pedido.');
      },
    });
  }

  responder(pedido: PedidoReservaListItem, aceitar: boolean): void {
    const acao = aceitar ? 'aceitar' : 'rejeitar';
    if (!confirm(`Confirma ${acao} o pedido ${pedido.codigo}?`)) return;

    this.erro = null;
    this.aviso = null;
    this.respondendo = pedido.id;

    this.service.responder(pedido.id, aceitar).subscribe({
      next: (resposta) => {
        this.respondendo = null;
        this.aviso = resposta.message;
        this.carregar();
      },
      error: (erro: unknown) => {
        this.respondendo = null;
        this.erro = mensagemDeErro(erro, `Não foi possível ${acao} o pedido.`);
      },
    });
  }
}
