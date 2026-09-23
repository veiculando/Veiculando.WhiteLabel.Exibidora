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
import { AurumDropdownComponent, AurumDropdownOpcao } from '../../shared/aurum/aurum-dropdown.component';
import { AurumFilterFieldComponent } from '../../shared/aurum/aurum-filter-field.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumStatCardComponent } from '../../shared/aurum/aurum-stat-card.component';
import { AurumFilterBarComponent } from '../../shared/aurum/aurum-filter-bar.component';
import { AurumModalComponent } from '../../shared/aurum/aurum-modal.component';
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
    AurumDropdownComponent,
    AurumFilterFieldComponent,
    AurumTextInputComponent,
    AurumStatusPillComponent,
    AurumStatCardComponent,
    AurumFilterBarComponent,
    AurumModalComponent,
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
  ],
  template: `
    <aurum-page-header
      titulo="Pedidos de Inserção (PIs)"
      [badge]="resumo?.afiliadaId ? 'Afiliada #' + resumo?.afiliadaId : ''"
      subtitulo="Documentos formais de veiculação e download de PDFs de Pedidos de Inserção."
    />

    @if (resumo; as r) {
      <div class="pi-dashboard">
        <aurum-stat-card rotulo="Total de pedidos" [valor]="r.totalPIs">
          {{ r.totalPecas }} {{ r.totalPecas === 1 ? 'peça atrelada' : 'peças atreladas' }}
        </aurum-stat-card>
        <aurum-stat-card rotulo="Valor líquido total" [valor]="moeda(r.valorLiquidoTotal)">Total contratado</aurum-stat-card>
        <aurum-stat-card rotulo="PIs veiculadas" tomRotulo="sucesso" [valor]="quantidadePorStatus(r, 'Veiculado')">
          {{ moeda(valorPorStatus(r, 'Veiculado')) }}
        </aurum-stat-card>
        <aurum-stat-card rotulo="PIs em checking" tomRotulo="aviso" [valor]="quantidadePorStatus(r, 'Checking')">
          {{ moeda(valorPorStatus(r, 'Checking')) }}
        </aurum-stat-card>
      </div>
    }

    <aurum-filter-bar>
      <aurum-text-input placeholder="Buscar por PI, anunciante, agência ou campanha…" rotulo="Buscar" [valor]="busca" (valorChange)="mudarBusca($event)" />
      <aurum-filter-field rotulo="Status">
        <aurum-dropdown [opcoes]="opcoesStatus" [valor]="status === null ? TODOS : status" (valorChange)="mudarStatus($event)" />
      </aurum-filter-field>
      <aurum-filter-field rotulo="Ordenar">
        <aurum-dropdown [opcoes]="opcoesOrdenacao" [valor]="ordenarPor" (valorChange)="mudarOrdenacao($event)" />
      </aurum-filter-field>
      <aurum-button variante="outline" tamanho="sm" (click)="alternarDirecao()">{{ desc ? '↓ Mais recente' : '↑ Mais antigo' }}</aurum-button>
      <aurum-button variante="outline" tamanho="sm" (click)="limparFiltros()">Limpar filtros</aurum-button>
    </aurum-filter-bar>

    @if (carregando) {
      <div class="wl-estado wl-estado--carregando">Carregando PIs…</div>
    }

    @if (erro) {
      <div class="wl-estado wl-estado--erro">
        {{ erro }}
        <aurum-button variante="outline" tamanho="sm" (click)="carregar()">Tentar novamente</aurum-button>
      </div>
    }

    @if (!carregando && !erro && pedidos.length === 0) {
      <div class="wl-estado wl-estado--vazio">
        Nenhum pedido de inserção encontrado.
      </div>
    }

    @if (pedidos.length > 0) {
      <div class="wl-tabela--rolavel">
        <table aurumTable class="aurum-table--densa">
          <thead>
            <tr aurumTableRow>
              <th aurumTableHeaderCell>Pedido</th>
              <th aurumTableHeaderCell>Cidade</th>
              <th aurumTableHeaderCell>Período</th>
              <th aurumTableHeaderCell>Anunciante</th>
              <th aurumTableHeaderCell>Agência</th>
              <th aurumTableHeaderCell>Campanha</th>
              <th aurumTableHeaderCell>Peças</th>
              <th aurumTableHeaderCell>Valor Líquido</th>
              <th aurumTableHeaderCell>Data</th>
              <th aurumTableHeaderCell>Status</th>
              <th aurumTableHeaderCell>Ação</th>
            </tr>
          </thead>
          <tbody>
            @for (pedido of pedidos; track pedido.id) {
              <tr aurumTableRow>
                <td aurumTableCell class="pi-codigo">{{ pedido.codigo }}</td>
                <td aurumTableCell class="pi-forte">{{ pedido.cidade || '—' }}</td>
                <td aurumTableCell class="pi-apagado">{{ periodoTexto(pedido) }}</td>
                <td aurumTableCell class="pi-anunciante">{{ pedido.anunciante || '—' }}</td>
                <td aurumTableCell class="pi-apagado">{{ pedido.agencia }}</td>
                <td aurumTableCell>{{ pedido.campanha || '—' }}</td>
                <td aurumTableCell class="pi-forte">{{ pedido.itensCount }}</td>
                <td aurumTableCell class="pi-valor">{{ moeda(pedido.valorLiquidoVeiculacao) }}</td>
                <td aurumTableCell class="pi-apagado">{{ pedido.dataCadastro | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td aurumTableCell><aurum-status-pill [rotulo]="pedido.status" [tom]="tomStatus(pedido.status)" compacto /></td>
                <td aurumTableCell>
                  <aurum-button variante="gold" tamanho="xs" [desabilitado]="baixando === pedido.codigo" (click)="baixarPi(pedido.codigo)">
                    ⭳ {{ baixando === pedido.codigo ? 'Abrindo…' : 'Baixar PI' }}
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

    <!-- Retorno do download (Figma 420:27221 carregando / 420:26637 sucesso). -->
    <aurum-modal [aberto]="!!baixando || !!baixado" largura="sm" [semFechar]="!!baixando" (fechar)="baixado = null">
      <div class="pi-download" role="status" aria-live="polite">
        <span class="aurum-ico pi-download__icone" style="--ico: url(/assets/aurum/icon-pedidos-insercao.svg)"></span>
        <h2>{{ baixando || baixado }} — Download do PI</h2>
        @if (baixando) {
          <p>Gerando o documento para a Afiliada{{ resumo?.afiliadaId ? ' #' + resumo?.afiliadaId : '' }}.</p>
          <strong class="pi-download__estado">Preparando documento em PDF…</strong>
          <span class="pi-download__barra"><span></span></span>
        } @else {
          <p>O PDF foi aberto em uma nova aba.</p>
          <aurum-button variante="wine" tamanho="sm" (click)="baixado = null">OK, Entendido</aurum-button>
        }
      </div>
    </aurum-modal>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .pi-dashboard {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      }
      .pi-codigo {
        font-family: var(--font-mono);
        font-weight: 700;
        color: var(--primary-color);
        white-space: nowrap;
      }
      .pi-anunciante {
        font-weight: 700;
        color: var(--primary-dark);
      }
      .pi-forte {
        font-weight: 600;
      }
      .pi-apagado {
        color: var(--on-surface);
      }
      .pi-valor {
        font-family: var(--font-display);
        font-weight: 700;
        color: var(--primary-dark);
        white-space: nowrap;
      }
      .pi-download {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        text-align: center;
      }
      .pi-download__icone {
        width: 32px;
        height: 32px;
        color: var(--primary-color);
      }
      .pi-download h2 {
        margin: 4px 0 0;
        font-size: 1.125rem;
        font-weight: 700;
      }
      .pi-download p {
        margin: 0 0 8px;
        font-size: 0.78125rem;
        color: var(--on-surface);
      }
      .pi-download__estado {
        font-size: 0.78125rem;
        color: var(--primary-dark);
      }
      .pi-download__barra {
        width: 100%;
        height: 6px;
        overflow: hidden;
        border-radius: var(--radius-pill);
        background: rgba(0, 0, 0, 0.08);
      }
      .pi-download__barra span {
        display: block;
        width: 40%;
        height: 100%;
        border-radius: inherit;
        background: var(--gold-grad);
        animation: pi-progresso 1.2s ease-in-out infinite;
      }
      @keyframes pi-progresso {
        from { transform: translateX(-100%); }
        to { transform: translateX(250%); }
      }
      @media (prefers-reduced-motion: reduce) {
        .pi-download__barra span {
          width: 100%;
          animation: none;
        }
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
  /** Código do último PI aberto — mostra o diálogo de sucesso do Figma. */
  baixado: string | null = null;

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

  valorPorStatus(resumo: PedidosInsercaoResumo, status: StatusPedidoInsercao): number {
    return resumo.porStatus.find((s) => s.status === status)?.valor ?? 0;
  }

  /** `pt-BR` sem centavos, como os valores do Figma ("R$ 127.600"). */
  moeda(valor: number | null | undefined): string {
    return (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }

  quantidadePorStatus(resumo: PedidosInsercaoResumo, status: StatusPedidoInsercao): number {
    return resumo.porStatus.find((s) => s.status === status)?.quantidade ?? 0;
  }

  tomStatus(status: string): 'neutro' | 'sucesso' | 'aviso' | 'perigo' | 'primario' | 'info' {
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
        this.baixado = codigo;

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
