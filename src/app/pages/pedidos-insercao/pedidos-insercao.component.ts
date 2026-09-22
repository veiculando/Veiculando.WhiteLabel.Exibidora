import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import {
  PedidoInsercaoListItem,
  PedidosInsercaoOrdenacao,
  PedidosInsercaoResumo,
  STATUS_PEDIDO_INSERCAO,
  StatusPedidoInsercao,
  TOM_STATUS_PEDIDO_INSERCAO,
} from '../../core/models/wl.models';
import { mensagemDeErro } from '../../core/http/api-error';
import { formatarDiaMes } from '../../core/http/datas';
import { PedidosInsercaoService } from '../../core/services/pedidos.service';
import { PaginadorComponent } from '../../shared/paginador.component';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumCardComponent } from '../../shared/aurum/aurum-card.component';
import { AurumDropdownComponent, AurumDropdownOpcao } from '../../shared/aurum/aurum-dropdown.component';
import { AurumFilterFieldComponent } from '../../shared/aurum/aurum-filter-field.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent } from '../../shared/aurum/aurum-status-pill.component';
import { AurumTextInputComponent } from '../../shared/aurum/aurum-text-input.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';

const TODOS = '';

/** Rótulo de cada opção do dropdown "Ordenar" — os mesmos 6 critérios aceitos pelo `sort` do BFF. */
const OPCOES_ORDENACAO: { valor: PedidosInsercaoOrdenacao; rotulo: string }[] = [
  { valor: 'dataPedido', rotulo: 'Data do pedido' },
  { valor: 'periodo', rotulo: 'Período' },
  { valor: 'cidade', rotulo: 'Cidade' },
  { valor: 'anunciante', rotulo: 'Anunciante' },
  { valor: 'agencia', rotulo: 'Agência' },
  { valor: 'campanha', rotulo: 'Campanha' },
];

/**
 * Pedidos de Inserção — VEI-RD-94 (Figma `154:7083`).
 *
 * Mini-dashboard de 4 cards, todos calculados no SERVIDOR
 * (`PedidosInsercaoController.MontarResumoAsync`) sobre a MESMA query
 * filtrada da listagem — o componente nunca soma `pedidos` em memória, e os
 * agregados mudam quando o filtro muda.
 *
 * Os 2 cards "por status" usam os status OFICIAIS do domínio (Checking,
 * Veiculado), nunca os rótulos mock do Figma ("Em Veiculação", "Em Produção
 * / Assinatura") — esses rótulos não existem no `StatusPedidoInsercaoEnum` e
 * a listagem/õs filtros já são só os 6 valores reais
 * (Novo/Aprovado/Checking/Veiculado/Rejeitado/Cancelado).
 *
 * O PDF é baixado do BFF em mesma origem e aberto a partir de um blob local
 * — nunca um `<a href>` direto para o FileServer (sem `[Authorize]`, sem
 * filtro por afiliada).
 */
@Component({
  selector: 'app-pedidos-insercao',
  imports: [
    CommonModule,
    PaginadorComponent,
    AurumPageHeaderComponent,
    AurumButtonComponent,
    AurumCardComponent,
    AurumDropdownComponent,
    AurumFilterFieldComponent,
    AurumTextInputComponent,
    AurumStatusPillComponent,
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
  ],
  template: `
    <aurum-page-header titulo="Pedidos de Inserção (PIs)" subtitulo="PIs autorizadas para esta exibidora.">
      @if (resumo?.afiliadaId; as afiliadaId) {
        <span aurumPageHeaderBadge class="pi-badge">Afiliada #{{ afiliadaId }}</span>
      }
    </aurum-page-header>

    @if (resumo; as r) {
      <div class="pi-dashboard">
        <aurum-card class="pi-kpi">
          <span class="pi-kpi__rotulo">Total de Pedidos</span>
          <span class="pi-kpi__valor">{{ r.totalPIs }}</span>
          <span class="pi-kpi__sub">{{ r.totalPecas }} {{ r.totalPecas === 1 ? 'peça' : 'peças' }}</span>
        </aurum-card>
        <aurum-card class="pi-kpi">
          <span class="pi-kpi__rotulo">Valor Líquido Total</span>
          <span class="pi-kpi__valor">{{ r.valorLiquidoTotal | currency: 'BRL' : 'symbol' : '1.2-2' }}</span>
        </aurum-card>
        <aurum-card class="pi-kpi">
          <span class="pi-kpi__rotulo">PIs em Checking</span>
          <span class="pi-kpi__valor">{{ quantidadePorStatus(r, 'Checking') }}</span>
        </aurum-card>
        <aurum-card class="pi-kpi">
          <span class="pi-kpi__rotulo">PIs Veiculadas</span>
          <span class="pi-kpi__valor">{{ quantidadePorStatus(r, 'Veiculado') }}</span>
        </aurum-card>
      </div>
    }

    <div class="pi-filtros">
      <aurum-text-input placeholder="Buscar por PI, anunciante, agência ou campanha" rotulo="Buscar" [valor]="busca" (valorChange)="mudarBusca($event)" />
      <aurum-filter-field rotulo="Status">
        <aurum-dropdown [opcoes]="opcoesStatus" [valor]="status === null ? TODOS : status" (valorChange)="mudarStatus($event)" />
      </aurum-filter-field>
      <aurum-filter-field rotulo="Ordenar">
        <aurum-dropdown [opcoes]="opcoesOrdenacao" [valor]="ordenarPor" (valorChange)="mudarOrdenacao($event)" />
      </aurum-filter-field>
      <aurum-button variante="ghost" (click)="alternarDirecao()">{{ desc ? '↓ Mais recente' : '↑ Mais antigo' }}</aurum-button>
      <aurum-button variante="ghost" (click)="limparFiltros()">Limpar Filtros</aurum-button>
    </div>

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
              <th aurumTableHeaderCell>Status</th>
              <th aurumTableHeaderCell>Pedido</th>
              <th aurumTableHeaderCell>Cidade</th>
              <th aurumTableHeaderCell>Período</th>
              <th aurumTableHeaderCell>Anunciante</th>
              <th aurumTableHeaderCell>Agência</th>
              <th aurumTableHeaderCell>Campanha</th>
              <th aurumTableHeaderCell>Peças</th>
              <th aurumTableHeaderCell>Valor Líquido</th>
              <th aurumTableHeaderCell>Data</th>
              <th aurumTableHeaderCell>Ação</th>
            </tr>
          </thead>
          <tbody>
            @for (pedido of pedidos; track pedido.id) {
              <tr aurumTableRow>
                <td aurumTableCell><aurum-status-pill [rotulo]="pedido.status" [tom]="tomStatus(pedido.status)" /></td>
                <td aurumTableCell>{{ pedido.codigo }}</td>
                <td aurumTableCell>{{ pedido.cidade || '—' }}</td>
                <td aurumTableCell>{{ periodoTexto(pedido) }}</td>
                <td aurumTableCell>{{ pedido.anunciante || '—' }}</td>
                <td aurumTableCell>{{ pedido.agencia }}</td>
                <td aurumTableCell>{{ pedido.campanha || '—' }}</td>
                <td aurumTableCell>{{ pedido.itensCount }}</td>
                <td aurumTableCell>{{ pedido.valorLiquidoVeiculacao | currency: 'BRL' : 'symbol' : '1.2-2' }}</td>
                <td aurumTableCell>{{ pedido.dataCadastro | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td aurumTableCell>
                  <aurum-button
                    variante="ghost"
                    [desabilitado]="baixando === pedido.codigo"
                    (click)="baixarPi(pedido.codigo)"
                  >
                    {{ baixando === pedido.codigo ? 'Abrindo…' : 'Baixar PI' }}
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
  styles: [
    `
      .pi-badge {
        display: inline-flex;
        align-items: center;
        border-radius: var(--radius-pill);
        background: var(--surface-muted);
        color: var(--on-surface);
        font-size: 0.75rem;
        font-weight: 600;
        padding: 4px 12px;
      }
      .pi-dashboard {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin-bottom: 20px;
      }
      .pi-kpi {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .pi-kpi__rotulo {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--on-surface);
      }
      .pi-kpi__valor {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--charcoal);
      }
      .pi-kpi__sub {
        font-size: 0.75rem;
        color: var(--on-surface);
      }
      .pi-filtros {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 12px;
        margin-bottom: 16px;
      }
    `,
  ],
})
export class PedidosInsercaoComponent implements OnInit {
  private service = inject(PedidosInsercaoService);

  readonly TODOS = TODOS;
  readonly opcoesStatus: AurumDropdownOpcao[] = [
    { valor: TODOS, rotulo: 'Todos' },
    ...STATUS_PEDIDO_INSERCAO.map((status) => ({ valor: status, rotulo: status })),
  ];
  readonly opcoesOrdenacao: AurumDropdownOpcao[] = OPCOES_ORDENACAO.map((o) => ({ valor: o.valor, rotulo: o.rotulo }));

  pedidos: PedidoInsercaoListItem[] = [];
  resumo: PedidosInsercaoResumo | null = null;
  carregando = false;
  erro: string | null = null;

  /** Código da PI cujo PDF está sendo baixado, para desabilitar só aquele botão. */
  baixando: string | null = null;

  busca = '';
  status: StatusPedidoInsercao | null = null;
  ordenarPor: PedidosInsercaoOrdenacao = 'dataPedido';
  desc = true;

  page = 1;
  pageSize = 25;
  total = 0;
  totalPaginas = 0;

  private timerBusca: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(page = this.page): void {
    this.carregando = true;
    this.erro = null;

    this.service
      .listar(
        { busca: this.busca.trim() || null, status: this.status },
        { page, pageSize: this.pageSize, sort: this.ordenarPor, desc: this.desc }
      )
      .subscribe({
        next: (pagina) => {
          this.pedidos = pagina.itens;
          this.resumo = pagina.resumo;
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

  mudarBusca(valor: string): void {
    this.busca = valor;
    clearTimeout(this.timerBusca);
    this.timerBusca = setTimeout(() => this.carregar(1), 400);
  }

  mudarStatus(valor: string): void {
    this.status = valor === TODOS ? null : (valor as StatusPedidoInsercao);
    this.carregar(1);
  }

  mudarOrdenacao(valor: string): void {
    this.ordenarPor = valor as PedidosInsercaoOrdenacao;
    this.carregar(1);
  }

  alternarDirecao(): void {
    this.desc = !this.desc;
    this.carregar(1);
  }

  limparFiltros(): void {
    this.busca = '';
    this.status = null;
    this.ordenarPor = 'dataPedido';
    this.desc = true;
    this.carregar(1);
  }

  quantidadePorStatus(resumo: PedidosInsercaoResumo, status: StatusPedidoInsercao): number {
    return resumo.porStatus.find((s) => s.status === status)?.quantidade ?? 0;
  }

  tomStatus(status: string): 'neutro' | 'sucesso' | 'aviso' | 'perigo' | 'primario' {
    return TOM_STATUS_PEDIDO_INSERCAO[status] ?? 'neutro';
  }

  /** Cidade/Período ainda não vêm do BFF (ver `PedidoInsercaoListItem`) — "—" até existirem. */
  periodoTexto(pedido: PedidoInsercaoListItem): string {
    if (!pedido.periodoInicio || !pedido.periodoFim) return '—';
    return `${formatarDiaMes(pedido.periodoInicio)}–${formatarDiaMes(pedido.periodoFim)}`;
  }

  baixarPi(codigo: string): void {
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
        // Erro vira mensagem na tela — nunca navega para uma pagina quebrada.
        this.erro = mensagemDeErro(erro, 'Não foi possível abrir o PDF deste pedido.');
      },
    });
  }
}
