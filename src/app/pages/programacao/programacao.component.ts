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
    <aurum-page-header
      titulo="Programação"
      subtitulo="Grade matriz de peças por período — visualize e valide o status de programação de cada suporte antes de gerar Ordens de Serviço."
    />

    <section class="pg-filtros">
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
        <aurum-filter-field rotulo="Anunciante" posicaoRotulo="acima">
          <aurum-text-input placeholder="Buscar anunciante…" rotulo="Buscar anunciante" [valor]="anunciante" (valorChange)="mudarAnunciante($event)" />
        </aurum-filter-field>
        <aurum-button variante="outline" tamanho="sm" (click)="limparFiltros()">Limpar Filtros</aurum-button>
      </div>

      @if (erroValidacao) {
        <p class="pg-filtros__dica pg-filtros__dica--erro" role="alert">{{ erroValidacao }}</p>
      } @else {
        <p class="pg-filtros__dica">Período inicial deve ser anterior ou igual ao período final</p>
      }
    </section>

    <div class="pg-legenda" role="note" aria-label="Legenda de status">
      <span class="pg-legenda__titulo">Legenda:</span>
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
        <aurum-button variante="outline" tamanho="sm" (click)="carregar()">Tentar novamente</aurum-button>
      </div>
    }

    @if (!carregando && !erro && linhas.length === 0) {
      <section class="pg-vazio">
        <span class="pg-vazio__icone" aria-hidden="true">🔍</span>
        <h2>Nenhuma peça encontrada para os filtros selecionados</h2>
        <p>Tente ajustar o período, a cidade ou o status para visualizar peças na grade de programação.</p>
        <aurum-button variante="outline" tamanho="sm" (click)="limparFiltros()">Limpar Filtros</aurum-button>
      </section>
    }

    @if (linhas.length > 0) {
      <div class="pg-grade">
        <table aurumTable>
          <thead>
            <tr aurumTableRow>
              <th aurumTableHeaderCell>Foto</th>
              <th aurumTableHeaderCell>Código</th>
              <th aurumTableHeaderCell>Cód. Interno</th>
              <th aurumTableHeaderCell>Endereço</th>
              <th aurumTableHeaderCell class="pg-ultima-fixa">Bairro</th>
              @for (periodo of colunas; track periodo.id) {
                <th aurumTableHeaderCell class="pg-periodo" [class.pg-periodo--atual]="periodoAtual(periodo.id)">
                  {{ periodo.nome }}
                  @if (periodoAtual(periodo.id)) {
                    <span class="pg-periodo__atual">Atual</span>
                  }
                </th>
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
                      <span class="pg-foto__placeholder" aria-hidden="true">🖼</span>
                    }
                  </span>
                </td>
                <td aurumTableCell class="pg-codigo">{{ linha.pecaCodigo }}</td>
                <td aurumTableCell class="pg-apagado">{{ linha.pecaCodigoInterno || '—' }}</td>
                <td aurumTableCell class="pg-endereco">{{ linha.endereco || '—' }}</td>
                <td aurumTableCell class="pg-ultima-fixa">{{ linha.bairro || '—' }}</td>
                @for (periodo of colunas; track periodo.id) {
                  <td aurumTableCell class="pg-periodo" [class.pg-periodo--atual]="periodoAtual(periodo.id)">
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
        gap: 16px;
        margin-bottom: 24px;
        padding: 20px 20px 16px;
        background: var(--white);
        border: 1px solid var(--line-subtle);
        border-radius: 18px;
        filter: drop-shadow(0 8px 16px rgba(74, 14, 14, 0.08));
      }
      .pg-filtros__linha {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 12px;
      }
      .pg-filtros__dica {
        margin: 0;
        font-size: 0.6875rem;
        color: color-mix(in srgb, var(--on-surface) 75%, transparent);
      }
      .pg-filtros__dica--erro {
        color: var(--danger);
      }
      .pg-legenda {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
      }
      .pg-legenda__titulo {
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: var(--on-surface);
      }
      .pg-vazio {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 44px 16px;
        text-align: center;
        background: var(--white);
        border: 1px solid var(--line-subtle);
        border-radius: 18px;
        filter: drop-shadow(0 8px 16px rgba(74, 14, 14, 0.08));
      }
      .pg-vazio__icone {
        display: grid;
        place-items: center;
        width: 64px;
        height: 64px;
        margin-bottom: 8px;
        border-radius: 50%;
        background: color-mix(in srgb, var(--secondary-color) 20%, transparent);
        font-size: 1.5rem;
      }
      .pg-vazio h2 {
        margin: 0;
        font-family: var(--font-ui);
        font-size: 0.9375rem;
        font-weight: 700;
        color: var(--primary-dark);
      }
      .pg-vazio p {
        max-width: 360px;
        margin: 0 0 12px;
        font-size: 0.78125rem;
        color: var(--on-surface);
      }
      .pg-grade {
        overflow-x: auto;
        border-radius: var(--radius-card);
      }
      .pg-grade [aurumTableHeaderCell],
      .pg-grade [aurumTableCell] {
        padding: 14px 10px;
        font-size: 0.78125rem;
      }
      .pg-codigo {
        white-space: nowrap;
        font-weight: 700;
        color: var(--charcoal);
      }
      .pg-apagado {
        color: color-mix(in srgb, var(--on-surface) 70%, transparent);
      }
      .pg-endereco {
        min-width: 150px;
      }
      .pg-ultima-fixa {
        border-right: 2px solid color-mix(in srgb, var(--primary-color) 15%, transparent);
      }
      .pg-periodo {
        text-align: center;
        white-space: nowrap;
      }
      .pg-periodo--atual {
        background: color-mix(in srgb, var(--secondary-color) 16%, var(--white));
      }
      th.pg-periodo--atual {
        border-top: 3px solid var(--primary-color);
        color: var(--primary-color);
      }
      .pg-periodo__atual {
        display: block;
        font-size: 0.5625rem;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      .pg-foto {
        display: inline-flex;
      }
      .pg-foto img {
        width: 24px;
        height: 24px;
        object-fit: cover;
        border-radius: 6px;
      }
      .pg-foto__placeholder {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: 1px solid var(--line-search);
        border-radius: 6px;
        background: var(--paper-bg);
        font-size: 0.75rem;
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
