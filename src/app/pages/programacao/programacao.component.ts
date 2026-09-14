
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginadorComponent } from '../../shared/paginador.component';
import { mensagemDeErro } from '../../core/http/api-error';
import { LocalListItem, PeriodoLookup, ProgramacaoItem } from '../../core/models/wl.models';
import { LocaisService } from '../../core/services/locais.service';
import { LookupsService } from '../../core/services/lookups.service';
import { ProgramacaoService } from '../../core/services/programacao.service';

/** Uma linha da grade: uma peça, com o status em cada período. */
interface LinhaGrade {
  pecaId: number;
  pecaCodigo: string;
  localCodigo: string;
  /** `periodoId` → status. */
  statusPorPeriodo: Map<number, string>;
}

/**
 * Grade de programação — card `473d740b`.
 *
 * `POST /api/wl/programacao/listar` devolve uma lista plana de
 * (peça × período × status), vinda de `PecaPeriodoStatus`. A grade é montada
 * aqui: peças nas linhas, períodos (bi-semanas) nas colunas — o formato do
 * painel legado.
 *
 * Os filtros de local e período são os mesmos do legado e são aplicados no
 * servidor; ausentes, significam "todos".
 */
@Component({
    selector: 'app-programacao',
    imports: [FormsModule, PaginadorComponent],
    template: `
    <div class="wl-page">
      <h1 class="wl-page__titulo">Grade de programação</h1>
      <p class="wl-page__descricao">Status de cada peça por bi-semana.</p>
    
      <div class="wl-toolbar">
        <div class="wl-campo">
          <label for="local">Local</label>
          <select id="local" [(ngModel)]="idLocal">
            <option [ngValue]="null">Todos</option>
            @for (local of locais; track local) {
              <option [ngValue]="local.id">
                {{ local.codigo }} — {{ local.descricao }}
              </option>
            }
          </select>
        </div>
    
        <div class="wl-campo">
          <label for="periodo">Bi-semana</label>
          <select id="periodo" [(ngModel)]="idPeriodo">
            <option [ngValue]="null">Todas</option>
            @for (periodo of periodos; track periodo) {
              <option [ngValue]="periodo.id">
                {{ periodo.nome }}
              </option>
            }
          </select>
        </div>
    
        <button class="wl-btn" type="button" [disabled]="carregando" (click)="aplicarFiltro()">
          {{ carregando ? 'Consultando…' : 'Consultar' }}
        </button>
      </div>
    
      @if (carregando) {
        <div class="wl-estado wl-estado--carregando">Carregando a grade…</div>
      }
    
      @if (erro) {
        <div class="wl-estado wl-estado--erro">
          {{ erro }}
          <button class="wl-btn wl-btn--link" type="button" (click)="carregar()">Tentar novamente</button>
        </div>
      }
    
      @if (!carregando && !erro && linhas.length === 0) {
        <div class="wl-estado wl-estado--vazio">
          Nenhuma programação encontrada para o filtro selecionado.
        </div>
      }
    
      @if (linhas.length > 0) {
        <div class="wl-tabela--rolavel">
          <table class="wl-tabela">
            <thead>
              <tr>
                <th>Local</th>
                <th>Peça</th>
                @for (periodo of colunas; track periodo) {
                  <th>{{ periodo.nome }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (linha of linhas; track linha) {
                <tr>
                  <td>{{ linha.localCodigo }}</td>
                  <td>{{ linha.pecaCodigo }}</td>
                  @for (periodo of colunas; track periodo) {
                    <td>
                      @if (linha.statusPorPeriodo.get(periodo.id); as status) {
                        <span class="wl-etiqueta">
                          {{ status }}
                        </span>
                      }
                      @if (!linha.statusPorPeriodo.has(periodo.id)) {
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
    </div>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [
        `
      .vazio {
        color: #b6b6bd;
      }
    `,
    ]
})
export class ProgramacaoComponent implements OnInit {
  private service = inject(ProgramacaoService);
  private lookups = inject(LookupsService);
  private locaisService = inject(LocaisService);

  locais: LocalListItem[] = [];
  periodos: PeriodoLookup[] = [];

  idLocal: number | null = null;
  idPeriodo: number | null = null;

  linhas: LinhaGrade[] = [];
  /** Períodos efetivamente presentes no resultado, na ordem em que aparecem. */
  colunas: { id: number; nome: string }[] = [];

  carregando = false;
  erro: string | null = null;

  page = 1;
  pageSize = 25;
  total = 0;
  totalPaginas = 0;

  ngOnInit(): void {
    this.locaisService.listar().subscribe({
      next: (locais) => (this.locais = locais),
      error: () => (this.locais = []),
    });
    this.lookups.periodos().subscribe({
      next: (periodos) => (this.periodos = periodos),
      error: () => (this.periodos = []),
    });
    this.carregar();
  }

  carregar(page = this.page): void {
    this.carregando = true;
    this.erro = null;

    this.service
      .listar({ idPeriodo: this.idPeriodo, idLocal: this.idLocal }, { page, pageSize: this.pageSize })
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
          this.erro = mensagemDeErro(erro, 'Não foi possível carregar a grade de programação.');
        },
      });
  }

  /** Trocar filtro volta para a primeira pagina — a pagina 3 do filtro antigo nao significa nada no novo. */
  aplicarFiltro(): void {
    this.carregar(1);
  }

  /** Pivota a lista plana do BFF em linhas (peça) × colunas (período). */
  private montarGrade(itens: ProgramacaoItem[]): void {
    const periodos = new Map<number, string>();
    const linhas = new Map<number, LinhaGrade>();

    for (const item of itens) {
      periodos.set(item.periodoId, item.periodoNome);

      let linha = linhas.get(item.pecaId);
      if (!linha) {
        linha = {
          pecaId: item.pecaId,
          pecaCodigo: item.pecaCodigo,
          localCodigo: item.localCodigo,
          statusPorPeriodo: new Map<number, string>(),
        };
        linhas.set(item.pecaId, linha);
      }
      linha.statusPorPeriodo.set(item.periodoId, item.status);
    }

    // As colunas seguem a ordem dos lookups (mais recente primeiro) quando o
    // período é conhecido; os desconhecidos vão para o fim.
    const ordemLookup = new Map(this.periodos.map((p, indice) => [p.id, indice]));
    this.colunas = [...periodos.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => (ordemLookup.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (ordemLookup.get(b.id) ?? Number.MAX_SAFE_INTEGER));

    this.linhas = [...linhas.values()].sort(
      (a, b) => a.localCodigo.localeCompare(b.localCodigo) || a.pecaCodigo.localeCompare(b.pecaCodigo)
    );
  }
}
