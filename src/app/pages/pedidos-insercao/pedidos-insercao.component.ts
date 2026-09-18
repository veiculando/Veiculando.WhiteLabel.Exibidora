import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { mensagemDeErro } from '../../core/http/api-error';
import { PedidoInsercaoListItem } from '../../core/models/wl.models';
import { PedidosInsercaoService } from '../../core/services/pedidos.service';
import { PaginadorComponent } from '../../shared/paginador.component';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent } from '../../shared/aurum/aurum-status-pill.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';

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
    imports: [
      CommonModule,
      PaginadorComponent,
      AurumPageHeaderComponent,
      AurumButtonComponent,
      AurumStatusPillComponent,
      AurumTableComponent,
      AurumTableRowComponent,
      AurumTableCellComponent,
      AurumTableHeaderCellComponent,
    ],
    template: `
    <aurum-page-header titulo="Pedidos de inserção" subtitulo="PIs autorizadas para esta exibidora." />

      @if (carregando) {
        <div class="wl-estado wl-estado--carregando">Carregando PIs…</div>
      }

      @if (erro) {
        <div class="wl-estado wl-estado--erro">
          {{ erro }}
          <aurum-button variante="ghost" (click)="carregar()">Tentar novamente</aurum-button>
        </div>
      }

      @if (!carregando && !erro && pedidos.length === 0) {
        <div class="wl-estado wl-estado--vazio">
          Nenhum pedido de inserção encontrado.
        </div>
      }

      @if (pedidos.length > 0) {
        <div class="wl-tabela--rolavel">
          <table aurumTable>
            <thead>
              <tr aurumTableRow>
                <th aurumTableHeaderCell>PI</th>
                <th aurumTableHeaderCell>Anunciante</th>
                <th aurumTableHeaderCell>Agência</th>
                <th aurumTableHeaderCell>Emissão</th>
                <th aurumTableHeaderCell>Status</th>
                <th aurumTableHeaderCell>Valor líquido</th>
                <th aurumTableHeaderCell>Detalhe</th>
              </tr>
            </thead>
            <tbody>
              @for (pedido of pedidos; track pedido) {
                <tr aurumTableRow>
                  <td aurumTableCell>{{ pedido.codigo }}</td>
                  <td aurumTableCell>{{ pedido.anunciante || '—' }}</td>
                  <td aurumTableCell>{{ pedido.agencia || '—' }}</td>
                  <td aurumTableCell>{{ pedido.dataCadastro | date: 'dd/MM/yyyy' }}</td>
                  <td aurumTableCell><aurum-status-pill [rotulo]="pedido.status" tom="neutro" /></td>
                  <td aurumTableCell>{{ pedido.valorLiquidoVeiculacao | currency: 'BRL' : 'symbol' : '1.2-2' }}</td>
                  <td aurumTableCell>
                    <aurum-button
                      variante="ghost"
                      [desabilitado]="baixando === pedido.codigo"
                      (click)="abrirPdf(pedido.codigo)"
                    >
                      {{ baixando === pedido.codigo ? 'Abrindo…' : 'Abrir PDF' }}
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
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
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
