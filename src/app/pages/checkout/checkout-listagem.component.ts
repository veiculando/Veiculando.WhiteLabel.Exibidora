import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { mensagemDeErro } from '../../core/http/api-error';
import {
  CheckoutListItem,
  CidadeLookup,
  PeriodoLookup,
  STATUS_CHECKING,
  TOM_STATUS_CHECKING,
} from '../../core/models/wl.models';
import { CheckoutService } from '../../core/services/checkout.service';
import { LookupsService } from '../../core/services/lookups.service';
import { PaginadorComponent } from '../../shared/paginador.component';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumDropdownComponent, AurumDropdownOpcao } from '../../shared/aurum/aurum-dropdown.component';
import { AurumFilterFieldComponent } from '../../shared/aurum/aurum-filter-field.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent } from '../../shared/aurum/aurum-status-pill.component';
import { AurumFilterBarComponent } from '../../shared/aurum/aurum-filter-bar.component';
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
 * `GET /api/wl/checking` (confirmado lendo `CheckingController.GetAll` real
 * no workspace irmão do BFF, 2026-09-22) — só tem UM campo de busca
 * textual (`busca`, contra Campanha OU Cliente), não campos independentes
 * de campanha/anunciante; e um INTERVALO de período
 * (`idPeriodoInicial`/`idPeriodoFinal`), não um único id — o dropdown
 * "Período" abaixo pina os dois limites no mesmo período escolhido.
 *
 * Colunas abreviadas Check./Aprov./Receb. levam `title`/`aria-label` com o
 * nome completo (acessibilidade — regra do card). SEM coluna Afiliada: a
 * listagem já é recortada por tenant no servidor.
 *
 * As 4 colunas numéricas (Itens PI/Check./Aprov./Receb.) vêm prontas do BFF
 * desde VEI-RD-91c (`itensPi`/`itensChecados`/`itensAprovados`/
 * `itensRecebidos`). A coluna Período continua "—": a listagem não projeta
 * um intervalo de veiculação agregado, só filtra por ele.
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
    AurumFilterBarComponent,
    AurumStatusPillComponent,
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
  ],
  template: `
    <aurum-page-header
      titulo="Check Out"
      subtitulo="Consulte os checkings realizados em campo e acompanhe a colagem com base nas fotos recebidas."
    />

    <aurum-filter-bar>
      <aurum-filter-field rotulo="Período">
        <aurum-dropdown [opcoes]="opcoesPeriodo" [valor]="idPeriodo === null ? TODOS : String(idPeriodo)" (valorChange)="mudarPeriodo($event)" />
      </aurum-filter-field>
      <aurum-filter-field rotulo="Status">
        <aurum-dropdown [opcoes]="opcoesStatus" [valor]="status === null ? TODOS : status" (valorChange)="mudarFiltro('status', $event)" />
      </aurum-filter-field>
      <aurum-filter-field rotulo="Cidade">
        <aurum-dropdown [opcoes]="opcoesCidade" [valor]="idCidade === null ? TODOS : String(idCidade)" (valorChange)="mudarFiltro('idCidade', $event)" />
      </aurum-filter-field>
      <aurum-text-input placeholder="Buscar campanha ou anunciante…" rotulo="Buscar por campanha ou anunciante" [valor]="busca" (valorChange)="mudarBusca($event)" />
      <aurum-button variante="outline" tamanho="sm" (click)="limparFiltros()">Limpar filtros</aurum-button>
    </aurum-filter-bar>

    @if (carregando) {
      <div class="wl-estado wl-estado--carregando">Carregando o check out…</div>
    }

    @if (erro) {
      <div class="wl-estado wl-estado--erro">
        {{ erro }}
        <aurum-button variante="outline" tamanho="sm" (click)="carregar()">Tentar novamente</aurum-button>
      </div>
    }

    @if (!carregando && !erro && itens.length === 0) {
      <div class="wl-estado wl-estado--vazio">Nenhuma PI encontrada para os filtros selecionados.</div>
    }

    @if (itens.length > 0) {
      <div class="wl-tabela--rolavel">
        <table aurumTable class="aurum-table--densa">
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
                <td aurumTableCell class="co-campanha">{{ item.campanha || '—' }}</td>
                <td aurumTableCell>{{ item.anunciante || '—' }}</td>
                <td aurumTableCell>{{ item.cidades.length > 0 ? item.cidades.join(', ') : '—' }}</td>
                <td aurumTableCell class="co-numero">{{ item.itensPi }}</td>
                <td aurumTableCell class="co-numero">{{ item.itensChecados }}</td>
                <td aurumTableCell class="co-numero">{{ item.itensAprovados }}</td>
                <td aurumTableCell class="co-numero">{{ item.itensRecebidos }}</td>
                <td aurumTableCell>—</td>
                <td aurumTableCell class="co-pi">{{ item.piCodigo || '—' }}</td>
                <td aurumTableCell>
                  <aurum-status-pill [rotulo]="item.status" [tom]="tomStatus(item.status)" />
                </td>
                <td aurumTableCell>
                  <a class="co-link" [routerLink]="['/checkout', item.id]" [attr.aria-label]="'Ver detalhe de ' + (item.piCodigo || item.campanha || 'PI')" title="Ver detalhe">
                    <span class="aurum-ico" style="--ico: url(/assets/aurum/icon-olho.svg)"></span>
                  </a>
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
      .co-campanha {
        font-weight: 600;
        color: var(--primary-dark);
      }
      .co-pi {
        white-space: nowrap;
      }
      .co-numero {
        text-align: right;
      }
      .co-link {
        display: inline-flex;
        padding: 4px;
        color: var(--primary-color);
      }
      .co-link .aurum-ico {
        width: 16px;
        height: 16px;
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
    ...STATUS_CHECKING.map((status) => ({ valor: status, rotulo: status })),
  ];
  opcoesPeriodo: AurumDropdownOpcao[] = [{ valor: TODOS, rotulo: 'Todos' }];
  opcoesCidade: AurumDropdownOpcao[] = [{ valor: TODOS, rotulo: 'Todas' }];

  private periodosCarregados: PeriodoLookup[] = [];
  private cidadesCarregadas: CidadeLookup[] = [];

  idPeriodo: number | null = null;
  status: string | null = null;
  idCidade: number | null = null;
  busca = '';

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
          // Um unico dropdown de Periodo pina os dois limites do intervalo
          // que o BFF aceita — nao existe um "idPeriodo" unico no contrato.
          idPeriodoInicial: this.idPeriodo,
          idPeriodoFinal: this.idPeriodo,
          status: this.status,
          idCidade: this.idCidade,
          busca: this.busca.trim() || null,
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

  mudarPeriodo(valor: string): void {
    this.idPeriodo = valor === TODOS ? null : Number(valor);
    this.carregar(1);
  }

  mudarFiltro(campo: 'status' | 'idCidade', valor: string): void {
    if (campo === 'status') {
      this.status = valor === TODOS ? null : valor;
    } else {
      this.idCidade = valor === TODOS ? null : Number(valor);
    }
    this.carregar(1);
  }

  mudarBusca(valor: string): void {
    this.busca = valor;
    clearTimeout(this.timerBusca);
    this.timerBusca = setTimeout(() => this.carregar(1), 400);
  }

  limparFiltros(): void {
    this.idPeriodo = null;
    this.status = null;
    this.idCidade = null;
    this.busca = '';
    this.carregar(1);
  }

  tomStatus(status: string): 'neutro' | 'sucesso' | 'aviso' | 'perigo' | 'primario' | 'info' {
    return TOM_STATUS_CHECKING[status] ?? 'neutro';
  }
}
