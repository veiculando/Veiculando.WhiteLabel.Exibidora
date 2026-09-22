import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginadorComponent } from '../../shared/paginador.component';
import { mensagemDeErro } from '../../core/http/api-error';
import {
  CidadeLookup,
  LEGENDA_STATUS_PROGRAMACAO,
  MSG_PERIODO_INVERTIDO,
  Periodicidade,
  PERIODICIDADE_ROTULOS,
  PeriodoLookup,
  ProgramacaoGradeItem,
  STATUS_PECA_PERIODO_ROTULOS,
  StatusPecaPeriodo,
} from '../../core/models/wl.models';
import { LookupsService } from '../../core/services/lookups.service';
import { ProgramacaoService } from '../../core/services/programacao.service';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumDropdownComponent, AurumDropdownOpcao } from '../../shared/aurum/aurum-dropdown.component';
import { AurumFilterFieldComponent } from '../../shared/aurum/aurum-filter-field.component';
import { AurumLegendItemComponent } from '../../shared/aurum/aurum-legend-item.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumPeriodCellComponent } from '../../shared/aurum/aurum-period-cell.component';
import { AurumTextInputComponent } from '../../shared/aurum/aurum-text-input.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';

/** Uma linha da grade: uma peça, com o status em cada período. */
interface LinhaGrade {
  pecaId: number;
  pecaCodigo: string;
  pecaCodigoInterno: string | null;
  fotoUrl: string | null;
  endereco: string | null;
  bairro: string | null;
  /** `periodoId` → status cru do BFF (nome do enum, ex. `Autorizada`). */
  statusPorPeriodo: Map<number, string>;
}

const TODOS = '';

/**
 * Grade de programação — VEI-RD-86 (Figma `184:1117` grade, `188:389` vazio).
 *
 * `POST /api/wl/programacao/listar` devolve uma lista plana de
 * (peça × período × status), vinda de `PecaPeriodoStatus`. A grade é montada
 * aqui: peças nas linhas, períodos (conforme a Periodicidade escolhida) nas
 * colunas.
 *
 * Filtros em duas linhas (Figma): Periodicidade/Período Inicial/Período
 * Final/Status/Cidade na primeira (rótulo em caixa alta acima do campo,
 * `posicaoRotulo="acima"`), Anunciante + Limpar Filtros na segunda. Trocar a
 * Periodicidade recarrega as opções de período e limpa a seleção — um id de
 * período de Bissemana não significa nada depois de trocar para Mensal.
 */
@Component({
  selector: 'app-programacao',
  imports: [
    FormsModule,
    PaginadorComponent,
    AurumPageHeaderComponent,
    AurumButtonComponent,
    AurumDropdownComponent,
    AurumFilterFieldComponent,
    AurumTextInputComponent,
    AurumLegendItemComponent,
    AurumPeriodCellComponent,
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
  ],
  template: `
    <aurum-page-header titulo="Grade de programação" subtitulo="Status de cada peça por período." />

    <div class="pg-filtros">
      <div class="pg-filtros__linha">
        <aurum-filter-field rotulo="Periodicidade" posicaoRotulo="acima">
          <aurum-dropdown [opcoes]="opcoesPeriodicidade" [valor]="String(periodicidade)" (valorChange)="mudarPeriodicidade($event)" />
        </aurum-filter-field>

        <aurum-filter-field rotulo="Período Inicial" posicaoRotulo="acima">
          <aurum-dropdown [opcoes]="opcoesPeriodo" [valor]="idPeriodoInicial === null ? TODOS : String(idPeriodoInicial)" (valorChange)="mudarPeriodoInicial($event)" />
        </aurum-filter-field>

        <aurum-filter-field rotulo="Período Final" posicaoRotulo="acima">
          <aurum-dropdown [opcoes]="opcoesPeriodo" [valor]="idPeriodoFinal === null ? TODOS : String(idPeriodoFinal)" (valorChange)="mudarPeriodoFinal($event)" />
        </aurum-filter-field>

        <aurum-filter-field rotulo="Status" posicaoRotulo="acima">
          <aurum-dropdown [opcoes]="opcoesStatus" [valor]="status === null ? TODOS : String(status)" (valorChange)="mudarFiltro('status', $event)" />
        </aurum-filter-field>

        <aurum-filter-field rotulo="Cidade" posicaoRotulo="acima">
          <aurum-dropdown [opcoes]="opcoesCidade" [valor]="idCidade === null ? TODOS : String(idCidade)" (valorChange)="mudarFiltro('idCidade', $event)" />
        </aurum-filter-field>
      </div>

      <div class="pg-filtros__linha">
        <aurum-text-input placeholder="Buscar por anunciante" rotulo="Buscar por anunciante" [valor]="anunciante" (valorChange)="mudarAnunciante($event)" />
        <aurum-button variante="ghost" (click)="limparFiltros()">Limpar Filtros</aurum-button>
      </div>
    </div>

    @if (erroValidacao) {
      <div class="wl-estado wl-estado--erro" role="alert">{{ erroValidacao }}</div>
    }

    <div class="pg-legenda" role="note" aria-label="Legenda de status">
      @for (item of legenda; track item.chave) {
        <aurum-legend-item [rotulo]="item.rotulo" />
      }
    </div>

    @if (carregando) {
      <div class="wl-estado wl-estado--carregando">Carregando a grade…</div>
    }

    @if (erro) {
      <div class="wl-estado wl-estado--erro">
        {{ erro }}
        <aurum-button variante="ghost" (click)="carregar()">Tentar novamente</aurum-button>
      </div>
    }

    @if (!carregando && !erro && linhas.length === 0) {
      <div class="wl-estado wl-estado--vazio pg-vazio">
        🔍 Nenhuma peça encontrada para os filtros selecionados
      </div>
    }

    @if (linhas.length > 0) {
      <div class="wl-tabela--rolavel">
        <table aurumTable>
          <thead>
            <tr aurumTableRow>
              <th aurumTableHeaderCell>Foto</th>
              <th aurumTableHeaderCell>Código</th>
              <th aurumTableHeaderCell>Cód. Interno</th>
              <th aurumTableHeaderCell>Endereço</th>
              <th aurumTableHeaderCell>Bairro</th>
              @for (periodo of colunas; track periodo.id) {
                <th aurumTableHeaderCell>{{ periodo.nome }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (linha of linhas; track linha.pecaId) {
              <tr aurumTableRow>
                <td aurumTableCell>
                  <span
                    class="pg-foto"
                    [title]="'Código: ' + linha.pecaCodigo + ' · Cód. interno: ' + (linha.pecaCodigoInterno || '—')"
                  >
                    @if (linha.fotoUrl) {
                      <img [src]="linha.fotoUrl" [alt]="'Foto da peça ' + linha.pecaCodigo" />
                    } @else {
                      <span class="pg-foto__placeholder" aria-hidden="true">—</span>
                    }
                  </span>
                </td>
                <td aurumTableCell>{{ linha.pecaCodigo }}</td>
                <td aurumTableCell>{{ linha.pecaCodigoInterno || '—' }}</td>
                <td aurumTableCell>{{ linha.endereco || '—' }}</td>
                <td aurumTableCell>{{ linha.bairro || '—' }}</td>
                @for (periodo of colunas; track periodo.id) {
                  <td aurumTableCell>
                    @if (linha.statusPorPeriodo.get(periodo.id); as statusCru) {
                      <aurum-period-cell [status]="rotuloStatus(statusCru)" [atual]="periodoAtual(periodo.id)" />
                    } @else {
                      <span class="vazio">—</span>
                    }
                  </td>
                }
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
      .pg-filtros {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 16px;
      }
      .pg-filtros__linha {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 16px;
      }
      .pg-legenda {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 16px;
      }
      .pg-vazio {
        text-align: center;
        padding: 40px 16px;
        font-size: 1rem;
      }
      .pg-foto {
        display: inline-flex;
      }
      .pg-foto img {
        width: 40px;
        height: 40px;
        object-fit: cover;
        border-radius: var(--radius-sm);
      }
      .pg-foto__placeholder {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: var(--radius-sm);
        background: var(--surface-muted);
        color: var(--on-surface);
      }
      .vazio {
        color: color-mix(in srgb, var(--on-surface) 50%, transparent);
      }
    `,
  ],
})
export class ProgramacaoComponent implements OnInit {
  private service = inject(ProgramacaoService);
  private lookups = inject(LookupsService);

  readonly TODOS = TODOS;
  readonly String = String;
  readonly legenda = LEGENDA_STATUS_PROGRAMACAO;

  readonly opcoesPeriodicidade: AurumDropdownOpcao[] = [
    { valor: String(Periodicidade.Semanal), rotulo: PERIODICIDADE_ROTULOS[Periodicidade.Semanal] },
    { valor: String(Periodicidade.Bissemanal), rotulo: PERIODICIDADE_ROTULOS[Periodicidade.Bissemanal] },
    { valor: String(Periodicidade.Mensal), rotulo: PERIODICIDADE_ROTULOS[Periodicidade.Mensal] },
  ];

  readonly opcoesStatus: AurumDropdownOpcao[] = [
    { valor: TODOS, rotulo: 'Todos' },
    ...LEGENDA_STATUS_PROGRAMACAO.map((item) => ({
      valor: String(StatusPecaPeriodo[item.chave as keyof typeof StatusPecaPeriodo]),
      rotulo: item.rotulo,
    })),
  ];

  opcoesPeriodo: AurumDropdownOpcao[] = [{ valor: TODOS, rotulo: 'Todos' }];
  opcoesCidade: AurumDropdownOpcao[] = [{ valor: TODOS, rotulo: 'Todas' }];

  private periodosCarregados: PeriodoLookup[] = [];
  private cidadesCarregadas: CidadeLookup[] = [];

  periodicidade: Periodicidade = Periodicidade.Bissemanal;
  idPeriodoInicial: number | null = null;
  idPeriodoFinal: number | null = null;
  status: StatusPecaPeriodo | null = null;
  idCidade: number | null = null;
  anunciante = '';

  linhas: LinhaGrade[] = [];
  colunas: { id: number; nome: string }[] = [];

  carregando = false;
  erro: string | null = null;
  erroValidacao: string | null = null;

  page = 1;
  pageSize = 25;
  total = 0;
  totalPaginas = 0;

  private timerAnunciante: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.lookups.cidades().subscribe({
      next: (cidades) => {
        this.cidadesCarregadas = cidades;
        this.opcoesCidade = [
          { valor: TODOS, rotulo: 'Todas' },
          ...cidades.map((c) => ({ valor: String(c.id), rotulo: `${c.nome} — ${c.sigla}` })),
        ];
      },
      error: () => (this.cidadesCarregadas = []),
    });
    this.carregarPeriodos();
    this.carregar();
  }

  private carregarPeriodos(): void {
    this.lookups.periodos(this.periodicidade).subscribe({
      next: (periodos) => {
        this.periodosCarregados = periodos;
        this.opcoesPeriodo = [
          { valor: TODOS, rotulo: 'Todos' },
          ...periodos.map((p) => ({ valor: String(p.id), rotulo: p.nome })),
        ];
      },
      error: () => {
        this.periodosCarregados = [];
        this.opcoesPeriodo = [{ valor: TODOS, rotulo: 'Todos' }];
      },
    });
  }

  mudarPeriodicidade(valor: string): void {
    this.periodicidade = Number(valor) as Periodicidade;
    // Um id de período de uma periodicidade não significa nada em outra —
    // a seleção incompatível é limpa, não só a lista recarregada.
    this.idPeriodoInicial = null;
    this.idPeriodoFinal = null;
    this.carregarPeriodos();
    this.aplicarFiltro();
  }

  mudarPeriodoInicial(valor: string): void {
    this.idPeriodoInicial = valor === TODOS ? null : Number(valor);
    this.aplicarFiltro();
  }

  mudarPeriodoFinal(valor: string): void {
    this.idPeriodoFinal = valor === TODOS ? null : Number(valor);
    this.aplicarFiltro();
  }

  mudarFiltro(campo: 'status' | 'idCidade', valor: string): void {
    const numerico = valor === TODOS ? null : Number(valor);
    if (campo === 'status') this.status = numerico;
    else this.idCidade = numerico;
    this.aplicarFiltro();
  }

  mudarAnunciante(valor: string): void {
    this.anunciante = valor;
    clearTimeout(this.timerAnunciante);
    this.timerAnunciante = setTimeout(() => this.aplicarFiltro(), 400);
  }

  limparFiltros(): void {
    this.idPeriodoInicial = null;
    this.idPeriodoFinal = null;
    this.status = null;
    this.idCidade = null;
    this.anunciante = '';
    this.aplicarFiltro();
  }

  /** Trocar filtro volta para a primeira página — a página 3 do filtro antigo não significa nada no novo. */
  aplicarFiltro(): void {
    this.carregar(1);
  }

  carregar(page = this.page): void {
    // Validação local, espelhando `ProgramacaoController.MsgPeriodoInvertido`:
    // compara a ORDEM real dos períodos (DataInicio), não os ids.
    const inicial = this.periodosCarregados.find((p) => p.id === this.idPeriodoInicial);
    const final = this.periodosCarregados.find((p) => p.id === this.idPeriodoFinal);
    if (inicial && final && new Date(inicial.dataInicio) > new Date(final.dataInicio)) {
      this.erroValidacao = MSG_PERIODO_INVERTIDO;
      return;
    }
    this.erroValidacao = null;

    this.carregando = true;
    this.erro = null;

    this.service
      .listar(
        {
          periodicidade: this.periodicidade,
          idPeriodoInicial: this.idPeriodoInicial,
          idPeriodoFinal: this.idPeriodoFinal,
          status: this.status,
          idCidade: this.idCidade,
          anunciante: this.anunciante.trim() || null,
        },
        { page, pageSize: this.pageSize }
      )
      .subscribe({
        next: (pagina) => {
          this.montarGrade(pagina.itens);
          this.page = pagina.page;
          this.pageSize = pagina.pageSize;
          // `total` conta PECAS, nao celulas: a pagina e de linhas da grade.
          this.total = pagina.total;
          this.totalPaginas = pagina.totalPaginas;
          this.carregando = false;
        },
        error: (erro: unknown) => {
          this.carregando = false;
          this.linhas = [];
          this.colunas = [];
          this.total = 0;
          this.totalPaginas = 0;
          const mensagem = mensagemDeErro(erro, 'Não foi possível carregar a grade de programação.');
          // O BFF valida a mesma regra no servidor; se o erro local não pegou
          // (ex.: periodos ainda carregando), a mensagem do 400 chega aqui.
          if (mensagem === MSG_PERIODO_INVERTIDO) {
            this.erroValidacao = mensagem;
          } else {
            this.erro = mensagem;
          }
        },
      });
  }

  rotuloStatus(statusCru: string): string {
    return STATUS_PECA_PERIODO_ROTULOS[statusCru] || statusCru;
  }

  periodoAtual(periodoId: number): boolean {
    const periodo = this.periodosCarregados.find((p) => p.id === periodoId);
    if (!periodo) return false;
    const hoje = new Date();
    return new Date(periodo.dataInicio) <= hoje && hoje <= new Date(periodo.dataFim);
  }

  /** Pivota a lista plana do BFF em linhas (peça) × colunas (período). */
  private montarGrade(itens: ProgramacaoGradeItem[]): void {
    const periodos = new Map<number, string>();
    const linhas = new Map<number, LinhaGrade>();

    for (const item of itens) {
      periodos.set(item.periodoId, item.periodoNome);

      let linha = linhas.get(item.pecaId);
      if (!linha) {
        linha = {
          pecaId: item.pecaId,
          pecaCodigo: item.pecaCodigo,
          pecaCodigoInterno: item.pecaCodigoInterno ?? null,
          fotoUrl: item.fotoUrl ?? null,
          endereco: item.endereco ?? null,
          bairro: item.bairro ?? null,
          statusPorPeriodo: new Map<number, string>(),
        };
        linhas.set(item.pecaId, linha);
      }
      linha.statusPorPeriodo.set(item.periodoId, item.status);
    }

    // As colunas seguem a ordem dos periodos carregados (mais recente
    // primeiro) quando o período é conhecido; os desconhecidos vão para o fim.
    const ordemLookup = new Map(this.periodosCarregados.map((p, indice) => [p.id, indice]));
    this.colunas = [...periodos.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => (ordemLookup.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (ordemLookup.get(b.id) ?? Number.MAX_SAFE_INTEGER));

    this.linhas = [...linhas.values()].sort((a, b) => a.pecaCodigo.localeCompare(b.pecaCodigo));
  }
}
