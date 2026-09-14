import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { mensagemDeErro } from '../../core/http/api-error';
import { PedidoInsercaoListItem } from '../../core/models/wl.models';
import { PedidosInsercaoService } from '../../core/services/pedidos.service';
import { PaginadorComponent } from '../../shared/paginador.component';

/**
 * Pedidos de inserção — card `c2a44cbc`.
 *
 * Listagem com as colunas **Anunciante** e **Agência** e acesso ao PDF de
 * detalhe.
 *
 * O PDF é baixado do BFF em mesma origem e aberto a partir de um blob local.
 * Não é mais um `<a href>` para o FileServer: aquele link levava o host de um
 * serviço sem `[Authorize]` e sem filtro por afiliada até o browser. Como o
 * download passa pelo interceptor de JWT, o botão precisa ser um handler — um
 * `href` não carregaria o token.
 */
@Component({
    selector: 'app-pedidos-insercao',
    imports: [CommonModule, PaginadorComponent],
    template: `
    <div class="wl-page">
      <h1 class="wl-page__titulo">Pedidos de inserção</h1>
      <p class="wl-page__descricao">PIs autorizadas para esta exibidora.</p>
    
      @if (carregando) {
        <div class="wl-estado wl-estado--carregando">Carregando PIs…</div>
      }
    
      @if (erro) {
        <div class="wl-estado wl-estado--erro">
          {{ erro }}
          <button class="wl-btn wl-btn--link" type="button" (click)="carregar()">Tentar novamente</button>
        </div>
      }
    
      @if (!carregando && !erro && pedidos.length === 0) {
        <div class="wl-estado wl-estado--vazio">
          Nenhum pedido de inserção encontrado.
        </div>
      }
    
      @if (pedidos.length > 0) {
        <div class="wl-tabela--rolavel">
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
              @for (pedido of pedidos; track pedido) {
                <tr>
                  <td>{{ pedido.codigo }}</td>
                  <td>{{ pedido.anunciante || '—' }}</td>
                  <td>{{ pedido.agencia || '—' }}</td>
                  <td>{{ pedido.dataCadastro | date: 'dd/MM/yyyy' }}</td>
                  <td><span class="wl-etiqueta">{{ pedido.status }}</span></td>
                  <td>{{ pedido.valorLiquidoVeiculacao | currency: 'BRL' : 'symbol' : '1.2-2' }}</td>
                  <td>
                    <button
                      class="wl-btn wl-btn--link"
                      type="button"
                      [disabled]="baixando === pedido.codigo"
                      (click)="abrirPdf(pedido.codigo)"
                    >
                      {{ baixando === pedido.codigo ? 'Abrindo…' : 'Abrir PDF' }}
                    </button>
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
    </div>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [
        `
      a {
        color: var(--primary-color);
      }
    `,
    ]
})
export class PedidosInsercaoComponent implements OnInit {
  private service = inject(PedidosInsercaoService);

  pedidos: PedidoInsercaoListItem[] = [];
  carregando = false;
  erro: string | null = null;

  /** Código da PI cujo PDF está sendo baixado, para desabilitar só aquele botão. */
  baixando: string | null = null;

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
        // O servidor pode devolver um pageSize menor que o pedido (teto de 100).
        this.pageSize = pagina.pageSize;
        this.total = pagina.total;
        this.totalPaginas = pagina.totalPaginas;
        this.carregando = false;
      },
      error: (erro: unknown) => {
        this.carregando = false;
        this.pedidos = [];
        this.erro = mensagemDeErro(erro, 'Não foi possível carregar os pedidos de inserção.');
      },
    });
  }

  abrirPdf(codigo: string): void {
    if (this.baixando) return;

    this.baixando = codigo;
    this.erro = null;

    this.service.pdf(codigo).subscribe({
      next: (blob) => {
        this.baixando = null;

        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');

        // O objectURL segura o blob em memória até ser revogado. A aba nova já
        // leu o conteúdo quando o timer dispara; revogar na hora abortaria o
        // carregamento em alguns browsers.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (erro: unknown) => {
        this.baixando = null;
        this.erro = mensagemDeErro(erro, 'Não foi possível abrir o PDF deste pedido.');
      },
    });
  }
}
