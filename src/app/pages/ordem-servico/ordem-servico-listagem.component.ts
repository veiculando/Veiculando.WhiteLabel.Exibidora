import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { mensagemDeErro } from '../../core/http/api-error';
import { CidadeLookup, OsListItem, PeriodoLookup, STATUS_OS, STATUS_OS_ROTULOS } from '../../core/models/wl.models';
import { LookupsService } from '../../core/services/lookups.service';
import { OrdemServicoService } from '../../core/services/ordem-servico.service';
import { PaginadorComponent } from '../../shared/paginador.component';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumDropdownComponent, AurumDropdownOpcao } from '../../shared/aurum/aurum-dropdown.component';
import { AurumFilterFieldComponent } from '../../shared/aurum/aurum-filter-field.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent, AurumStatusPillTom } from '../../shared/aurum/aurum-status-pill.component';
import { AurumFilterBarComponent } from '../../shared/aurum/aurum-filter-bar.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';
import { OrdemServicoEntregaModalComponent, OsEntregaContexto } from './ordem-servico-entrega-modal.component';

const TODOS = '';

/** Status da OS em pílula sólida, como no Figma `198:2`. */
const TOM_STATUS_OS: Record<string, AurumStatusPillTom> = {
  Aberta: 'solido-cinza',
  Atribuida: 'solido-azul',
  EmExecucao: 'solido-laranja',
  Concluida: 'solido-verde',
};

/**
 * Ordem de Serviço — listagem (VEI-RD-88a, Figma `198:2`).
 *
 * Status de OS tem 4 valores no Figma, mas nesta sprint toda OS nasce e
 * permanece `Aberta` — não existe UI de transição de status aqui, e
 * `RESPONSÁVEL` é sempre "Não atribuída": não existe fluxo de atribuição de
 * colador nesta sprint (regra dura, decisão humana 2026-09-17), então o
 * campo nunca é preenchido pela UI.
 *
 * A ação "Entregar" abre o modal de VEI-RD-88c; "BAIXAR PLANILHA (PDF)" sem
 * passar pelo modal fica só no detalhe (VEI-RD-88d).
 */
@Component({
  selector: 'app-ordem-servico-listagem',
  imports: [
    CommonModule,
    RouterLink,
    PaginadorComponent,
    AurumPageHeaderComponent,
    AurumButtonComponent,
    AurumDropdownComponent,
    AurumFilterFieldComponent,
    AurumStatusPillComponent,
    AurumFilterBarComponent,
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
    OrdemServicoEntregaModalComponent,
  ],
  template: `
    <aurum-page-header titulo="Ordem de Serviço" subtitulo="Gerencie as ordens de serviço geradas e acompanhe o status de execução.">
      <a aurumPageHeaderAcoes class="aurum-botao-link" routerLink="/ordens-servico/nova">+ Nova Ordem de Serviço</a>
    </aurum-page-header>

    <aurum-filter-bar>
      <aurum-filter-field rotulo="Período">
        <aurum-dropdown [opcoes]="opcoesPeriodo" [valor]="filtroPeriodo === null ? TODOS : String(filtroPeriodo)" (valorChange)="mudarPeriodo($event)" />
      </aurum-filter-field>
      <aurum-filter-field rotulo="Status">
        <aurum-dropdown [opcoes]="opcoesStatus" [valor]="status === null ? TODOS : status" (valorChange)="mudarStatus($event)" />
      </aurum-filter-field>
      <aurum-filter-field rotulo="Responsável">
        <aurum-dropdown [opcoes]="opcoesResponsavel" valor="" (valorChange)="carregar(1)" />
      </aurum-filter-field>
      <aurum-button variante="outline" tamanho="sm" (click)="limparFiltros()">Limpar filtros</aurum-button>
    </aurum-filter-bar>

    @if (carregando) {
      <div class="wl-estado wl-estado--carregando">Carregando ordens de serviço…</div>
    }

    @if (erro) {
      <div class="wl-estado wl-estado--erro">
        {{ erro }}
        <aurum-button variante="outline" tamanho="sm" (click)="carregar()">Tentar novamente</aurum-button>
      </div>
    }

    @if (!carregando && !erro && ordens.length === 0) {
      <div class="wl-estado wl-estado--vazio">Nenhuma ordem de serviço encontrada.</div>
    }

    @if (ordens.length > 0) {
      <div class="wl-tabela--rolavel">
        <table aurumTable class="aurum-table--densa">
          <thead>
            <tr aurumTableRow>
              <th aurumTableHeaderCell>OS Nº</th>
              <th aurumTableHeaderCell>Período</th>
              <th aurumTableHeaderCell>Cidade(s)</th>
              <th aurumTableHeaderCell>Responsável</th>
              <th aurumTableHeaderCell>Peças</th>
              <th aurumTableHeaderCell>Status</th>
              <th aurumTableHeaderCell>Criada em</th>
              <th aurumTableHeaderCell>Ação</th>
            </tr>
          </thead>
          <tbody>
            @for (os of ordens; track os.id) {
              <tr aurumTableRow>
                <td aurumTableCell class="os-numero">{{ os.numeroFormatado }}</td>
                <td aurumTableCell>{{ os.periodo || '—' }}</td>
                <td aurumTableCell>{{ os.cidades.length > 0 ? os.cidades.join(', ') : '—' }}</td>
                <td aurumTableCell>
                  <span class="os-responsavel">
                    <span class="os-avatar" aria-hidden="true">{{ os.responsavel ? iniciais(os.responsavel) : '—' }}</span>
                    @if (os.responsavel) {
                      {{ os.responsavel }}
                    } @else {
                      <span class="vazio">Não atribuída</span>
                    }
                  </span>
                </td>
                <td aurumTableCell>{{ os.pecasCount }}</td>
                <td aurumTableCell><aurum-status-pill [rotulo]="rotuloStatus(os.status)" [tom]="tomStatus(os.status)" /></td>
                <td aurumTableCell class="vazio">{{ os.dataCadastro | date: 'dd/MM/yyyy' }}</td>
                <td aurumTableCell class="os-acoes">
                  <a class="os-link" [routerLink]="['/ordens-servico', os.id]">Ver Detalhes</a>
                  <aurum-button variante="suave" tamanho="xs" (click)="abrirEntrega(os)">Entregar</aurum-button>
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

    <app-os-entrega-modal
      [aberto]="modalAberto"
      [contexto]="contextoEntrega"
      (fechar)="modalAberto = false"
      (entregue)="aoEntregar()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .os-numero {
        font-weight: 700;
        color: var(--primary-dark);
        white-space: nowrap;
      }
      .os-responsavel {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
      }
      .os-avatar {
        display: grid;
        place-items: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--primary-color);
        color: var(--white);
        font-size: 0.5625rem;
        font-weight: 600;
      }
      .os-acoes {
        white-space: nowrap;
      }
      .os-acoes aurum-button {
        margin-left: 12px;
      }
      .os-link {
        color: var(--primary-color);
        font-weight: 600;
        text-decoration: none;
      }
      .vazio {
        color: color-mix(in srgb, var(--on-surface) 75%, transparent);
      }
    `,
  ],
})
export class OrdemServicoListagemComponent implements OnInit {
  private service = inject(OrdemServicoService);
  private lookups = inject(LookupsService);

  readonly TODOS = TODOS;
  readonly String = String;
  readonly opcoesStatus: AurumDropdownOpcao[] = [
    { valor: TODOS, rotulo: 'Todos' },
    ...STATUS_OS.map((s) => ({ valor: s, rotulo: STATUS_OS_ROTULOS[s] })),
  ];
  /**
   * Sem endpoint de responsáveis/coladores nesta sprint (não existe fluxo de
   * atribuição — regra dura). O filtro aparece no Figma, então o campo fica
   * na tela com a única opção possível hoje, sem fingir uma lista que a UI
   * não tem como preencher.
   */
  readonly opcoesResponsavel: AurumDropdownOpcao[] = [{ valor: TODOS, rotulo: 'Todos' }];

  opcoesPeriodo: AurumDropdownOpcao[] = [{ valor: TODOS, rotulo: 'Todos' }];
  private periodosCarregados: PeriodoLookup[] = [];
  private cidadesCarregadas: CidadeLookup[] = [];

  filtroPeriodo: number | null = null;
  status: string | null = null;

  ordens: OsListItem[] = [];
  carregando = false;
  erro: string | null = null;

  page = 1;
  pageSize = 25;
  total = 0;
  totalPaginas = 0;

  modalAberto = false;
  contextoEntrega: OsEntregaContexto | null = null;

  ngOnInit(): void {
    this.lookups.periodos().subscribe({
      next: (periodos) => {
        this.periodosCarregados = periodos;
        this.opcoesPeriodo = [{ valor: TODOS, rotulo: 'Todos' }, ...periodos.map((p) => ({ valor: String(p.id), rotulo: p.nome }))];
      },
      error: () => (this.periodosCarregados = []),
    });
    this.lookups.cidades().subscribe({
      next: (cidades) => (this.cidadesCarregadas = cidades),
      error: () => (this.cidadesCarregadas = []),
    });
    this.carregar();
  }

  carregar(page = this.page): void {
    this.carregando = true;
    this.erro = null;

    this.service
      .listar(
        { idPeriodoInicial: this.filtroPeriodo, idPeriodoFinal: this.filtroPeriodo, status: this.status },
        { page, pageSize: this.pageSize }
      )
      .subscribe({
        next: (pagina) => {
          this.ordens = pagina.itens;
          this.page = pagina.page;
          this.pageSize = pagina.pageSize;
          this.total = pagina.total;
          this.totalPaginas = pagina.totalPaginas;
          this.carregando = false;
        },
        error: (erro: unknown) => {
          this.carregando = false;
          this.ordens = [];
          this.erro = mensagemDeErro(erro, 'Não foi possível carregar as ordens de serviço.');
        },
      });
  }

  mudarPeriodo(valor: string): void {
    this.filtroPeriodo = valor === TODOS ? null : Number(valor);
    this.carregar(1);
  }

  mudarStatus(valor: string): void {
    this.status = valor === TODOS ? null : valor;
    this.carregar(1);
  }

  limparFiltros(): void {
    this.filtroPeriodo = null;
    this.status = null;
    this.carregar(1);
  }

  tomStatus(status: string): AurumStatusPillTom {
    return TOM_STATUS_OS[status] ?? 'neutro';
  }

  iniciais(nome: string): string {
    const partes = nome.trim().split(/\s+/);
    return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
  }

  rotuloStatus(status: string): string {
    return STATUS_OS_ROTULOS[status] || status;
  }

  abrirEntrega(os: OsListItem): void {
    this.contextoEntrega = { id: os.id, numeroFormatado: os.numeroFormatado, pecasCount: os.pecasCount, periodoNome: os.periodo };
    this.modalAberto = true;
  }

  aoEntregar(): void {
    this.modalAberto = false;
    this.contextoEntrega = null;
  }
}
