import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { mensagemDeErro } from '../../core/http/api-error';
import { formatarDiaMes } from '../../core/http/datas';
import {
  CheckoutListItem,
  CidadeLookup,
  PeriodoLookup,
  STATUS_PEDIDO_INSERCAO,
  TOM_STATUS_PEDIDO_INSERCAO,
} from '../../core/models/wl.models';
import { CheckoutService } from '../../core/services/checkout.service';
import { LookupsService } from '../../core/services/lookups.service';
import { PaginadorComponent } from '../../shared/paginador.component';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
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

/**
 * Check out — listagem (VEI-RD-91, Figma `184:2`).
 *
 * Colunas abreviadas Check./Aprov./Receb. levam `title`/`aria-label` com o
 * nome completo (acessibilidade — regra do card). SEM coluna Afiliada: a
 * listagem já é recortada por tenant no servidor. `Período` mostra o
 * intervalo de datas de VEICULAÇÃO da PI (ex. `01/07–31/07`), não o período
 * comercial.
 */
@Component({
  selector: 'app-checkout-listagem',
  imports: [
    CommonModule,
    RouterLink,
    PaginadorComponent,
    AurumPageHeaderComponent,
    AurumButtonComponent,
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
    <aurum-page-header titulo="Check out" subtitulo="Situação de checking das PIs autorizadas." />

    <div class="co-filtros">
      <div class="co-filtros__linha">
        <aurum-filter-field rotulo="Período">
          <aurum-dropdown [opcoes]="opcoesPeriodo" [valor]="idPeriodo === null ? TODOS : String(idPeriodo)" (valorChange)="mudarFiltro('idPeriodo', $event)" />
        </aurum-filter-field>
        <aurum-filter-field rotulo="Status">
          <aurum-dropdown [opcoes]="opcoesStatus" [valor]="status === null ? TODOS : status" (valorChange)="mudarFiltro('status', $event)" />
        </aurum-filter-field>
        <aurum-filter-field rotulo="Cidade">
          <aurum-dropdown [opcoes]="opcoesCidade" [valor]="idCidade === null ? TODOS : String(idCidade)" (valorChange)="mudarFiltro('idCidade', $event)" />
        </aurum-filter-field>
        <aurum-text-input placeholder="Buscar por campanha" rotulo="Buscar por campanha" [valor]="campanha" (valorChange)="mudarBusca('campanha', $event)" />
        <aurum-text-input placeholder="Buscar por anunciante" rotulo="Buscar por anunciante" [valor]="anunciante" (valorChange)="mudarBusca('anunciante', $event)" />
        <aurum-button variante="ghost" (click)="limparFiltros()">Limpar Filtros</aurum-button>
      </div>
    </div>

    @if (carregando) {
      <div class="wl-estado wl-estado--carregando">Carregando o check out…</div>
    }

    @if (erro) {
      <div class="wl-estado wl-estado--erro">
        {{ erro }}
        <aurum-button variante="ghost" (click)="carregar()">Tentar novamente</aurum-button>
      </div>
    }

    @if (!carregando && !erro && itens.length === 0) {
      <div class="wl-estado wl-estado--vazio">Nenhuma PI encontrada para os filtros selecionados.</div>
    }

    @if (itens.length > 0) {
      <div class="wl-tabela--rolavel">
        <table aurumTable>
          <thead>
            <tr aurumTableRow>
              <th aurumTableHeaderCell>Campanha</th>
              <th aurumTableHeaderCell>Anunciante</th>
              <th aurumTableHeaderCell>Cidade</th>
              <th aurumTableHeaderCell>Itens PI</th>
              <th aurumTableHeaderCell title="Itens em checking" aria-label="Itens em checking">Check.</th>
              <th aurumTableHeaderCell title="Itens aprovados" aria-label="Itens aprovados">Aprov.</th>
              <th aurumTableHeaderCell title="Itens com foto recebida" aria-label="Itens com foto recebida">Receb.</th>
              <th aurumTableHeaderCell>Período</th>
              <th aurumTableHeaderCell>PI</th>
              <th aurumTableHeaderCell>Status</th>
              <th aurumTableHeaderCell>Ação</th>
            </tr>
          </thead>
          <tbody>
            @for (item of itens; track item.id) {
              <tr aurumTableRow>
                <td aurumTableCell>{{ item.campanha || '—' }}</td>
                <td aurumTableCell>{{ item.anunciante || '—' }}</td>
                <td aurumTableCell>{{ item.cidade || '—' }}</td>
                <td aurumTableCell>{{ item.itensPi }}</td>
                <td aurumTableCell>{{ item.itensChecking }}</td>
                <td aurumTableCell>{{ item.itensAprovados }}</td>
                <td aurumTableCell>{{ item.itensRecebidos }}</td>
                <td aurumTableCell>{{ periodoTexto(item) }}</td>
                <td aurumTableCell>{{ item.codigo }}</td>
                <td aurumTableCell>
                  <aurum-status-pill [rotulo]="item.status" [tom]="tomStatus(item.status)" />
                </td>
                <td aurumTableCell>
                  <a class="co-link" [routerLink]="['/checkout', item.codigo]">Ver detalhe</a>
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
      .co-filtros {
        margin-bottom: 16px;
      }
      .co-filtros__linha {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
      }
      .co-link {
        color: var(--primary-color);
        text-decoration: none;
      }
      .co-link:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class CheckoutListagemComponent implements OnInit {
  private service = inject(CheckoutService);
  private lookups = inject(LookupsService);

  readonly TODOS = TODOS;
  readonly String = String;
  readonly opcoesStatus: AurumDropdownOpcao[] = [
    { valor: TODOS, rotulo: 'Todos' },
    ...STATUS_PEDIDO_INSERCAO.map((status) => ({ valor: status, rotulo: status })),
  ];
  opcoesPeriodo: AurumDropdownOpcao[] = [{ valor: TODOS, rotulo: 'Todos' }];
  opcoesCidade: AurumDropdownOpcao[] = [{ valor: TODOS, rotulo: 'Todas' }];

  private periodosCarregados: PeriodoLookup[] = [];
  private cidadesCarregadas: CidadeLookup[] = [];

  idPeriodo: number | null = null;
  status: string | null = null;
  idCidade: number | null = null;
  campanha = '';
  anunciante = '';

  itens: CheckoutListItem[] = [];
  carregando = false;
  erro: string | null = null;

  page = 1;
  pageSize = 25;
  total = 0;
  totalPaginas = 0;

  private timerBusca: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.lookups.periodos().subscribe({
      next: (periodos) => {
        this.periodosCarregados = periodos;
        this.opcoesPeriodo = [{ valor: TODOS, rotulo: 'Todos' }, ...periodos.map((p) => ({ valor: String(p.id), rotulo: p.nome }))];
      },
      error: () => (this.periodosCarregados = []),
    });
    this.lookups.cidades().subscribe({
      next: (cidades) => {
        this.cidadesCarregadas = cidades;
        this.opcoesCidade = [{ valor: TODOS, rotulo: 'Todas' }, ...cidades.map((c) => ({ valor: String(c.id), rotulo: `${c.nome} — ${c.sigla}` }))];
      },
      error: () => (this.cidadesCarregadas = []),
    });
    this.carregar();
  }

  carregar(page = this.page): void {
    this.carregando = true;
    this.erro = null;

    this.service
      .listar(
        {
          idPeriodo: this.idPeriodo,
          status: this.status,
          idCidade: this.idCidade,
          campanha: this.campanha.trim() || null,
          anunciante: this.anunciante.trim() || null,
        },
        { page, pageSize: this.pageSize }
      )
      .subscribe({
        next: (pagina) => {
          this.itens = pagina.itens;
          this.page = pagina.page;
          this.pageSize = pagina.pageSize;
          this.total = pagina.total;
          this.totalPaginas = pagina.totalPaginas;
          this.carregando = false;
        },
        error: (erro: unknown) => {
          this.carregando = false;
          this.itens = [];
          this.erro = mensagemDeErro(erro, 'Não foi possível carregar o check out.');
        },
      });
  }

  mudarFiltro(campo: 'idPeriodo' | 'status' | 'idCidade', valor: string): void {
    if (campo === 'status') {
      this.status = valor === TODOS ? null : valor;
    } else {
      const numerico = valor === TODOS ? null : Number(valor);
      if (campo === 'idPeriodo') this.idPeriodo = numerico;
      else this.idCidade = numerico;
    }
    this.carregar(1);
  }

  mudarBusca(campo: 'campanha' | 'anunciante', valor: string): void {
    if (campo === 'campanha') this.campanha = valor;
    else this.anunciante = valor;
    clearTimeout(this.timerBusca);
    this.timerBusca = setTimeout(() => this.carregar(1), 400);
  }

  limparFiltros(): void {
    this.idPeriodo = null;
    this.status = null;
    this.idCidade = null;
    this.campanha = '';
    this.anunciante = '';
    this.carregar(1);
  }

  tomStatus(status: string): 'neutro' | 'sucesso' | 'aviso' | 'perigo' | 'primario' {
    return TOM_STATUS_PEDIDO_INSERCAO[status] ?? 'neutro';
  }

  /** `01/07–31/07`, formatado a partir das datas de veiculação (não o período comercial). */
  periodoTexto(item: CheckoutListItem): string {
    if (!item.periodoVeiculacaoInicio || !item.periodoVeiculacaoFim) return '—';
    return `${formatarDiaMes(item.periodoVeiculacaoInicio)}–${formatarDiaMes(item.periodoVeiculacaoFim)}`;
  }
}
