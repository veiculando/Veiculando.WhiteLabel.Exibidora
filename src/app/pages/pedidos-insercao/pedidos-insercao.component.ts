import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { mensagemDeErro } from '../../core/http/api-error';
import { PedidoInsercaoListItem } from '../../core/models/wl.models';
import { PedidosInsercaoService } from '../../core/services/pedidos.service';

/**
 * Pedidos de inserção — card `c2a44cbc`.
 *
 * Listagem com as colunas **Anunciante** e **Agência** e link para o PDF de
 * detalhe. O `pdfUrl` é montado pelo BFF a partir de `FILE_SERVER_URL` e aponta
 * para o FileServer legado; abre em nova aba com `rel="noopener"` para não expor
 * o `window.opener` do painel à página de destino.
 */
@Component({
  selector: 'app-pedidos-insercao',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wl-page">
      <h1 class="wl-page__titulo">Pedidos de inserção</h1>
      <p class="wl-page__descricao">PIs autorizadas para esta exibidora.</p>

      <div class="wl-estado wl-estado--carregando" *ngIf="carregando">Carregando PIs…</div>

      <div class="wl-estado wl-estado--erro" *ngIf="erro">
        {{ erro }}
        <button class="wl-btn wl-btn--link" type="button" (click)="carregar()">Tentar novamente</button>
      </div>

      <div class="wl-estado wl-estado--vazio" *ngIf="!carregando && !erro && pedidos.length === 0">
        Nenhum pedido de inserção encontrado.
      </div>

      <div class="wl-tabela--rolavel" *ngIf="pedidos.length > 0">
        <table class="wl-tabela">
          <thead>
            <tr>
              <th>PI</th>
              <th>Anunciante</th>
              <th>Agência</th>
              <th>Emissão</th>
              <th>Status</th>
              <th>Valor líquido</th>
              <th>Detalhe</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let pedido of pedidos">
              <td>{{ pedido.codigo }}</td>
              <td>{{ pedido.anunciante || '—' }}</td>
              <td>{{ pedido.agencia || '—' }}</td>
              <td>{{ pedido.dataCadastro | date: 'dd/MM/yyyy' }}</td>
              <td><span class="wl-etiqueta">{{ pedido.status }}</span></td>
              <td>{{ pedido.valorLiquidoVeiculacao | currency: 'BRL' : 'symbol' : '1.2-2' }}</td>
              <td>
                <a [href]="pedido.pdfUrl" target="_blank" rel="noopener">Abrir PDF</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      a {
        color: var(--primary-color);
      }
    `,
  ],
})
export class PedidosInsercaoComponent implements OnInit {
  private service = inject(PedidosInsercaoService);

  pedidos: PedidoInsercaoListItem[] = [];
  carregando = false;
  erro: string | null = null;

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
        this.erro = mensagemDeErro(erro, 'Não foi possível carregar os pedidos de inserção.');
      },
    });
  }
}
