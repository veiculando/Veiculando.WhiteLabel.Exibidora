import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { mensagemDeErro } from '../../core/http/api-error';
import {
  CidadeLookup,
  LEGENDA_STATUS_PROGRAMACAO,
  Periodicidade,
  PERIODICIDADE_ROTULOS,
  PeriodoLookup,
  OsPecaElegivel,
  StatusPecaPeriodo,
} from '../../core/models/wl.models';
import { LookupsService } from '../../core/services/lookups.service';
import { OrdemServicoService } from '../../core/services/ordem-servico.service';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumCheckboxComponent } from '../../shared/aurum/aurum-checkbox.component';
import { AurumDropdownComponent, AurumDropdownOpcao } from '../../shared/aurum/aurum-dropdown.component';
import { AurumFilterFieldComponent } from '../../shared/aurum/aurum-filter-field.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';
import { OrdemServicoEntregaModalComponent, OsEntregaContexto } from './ordem-servico-entrega-modal.component';

const TODOS = '';

/**
 * Ordem de Serviço — geração (VEI-RD-88b, Figma `186:86`).
 *
 * "Selecione as peças para gerar a rota e a autorização de colagem do
 * período." Ao confirmar, a OS nasce em `Aberta` e o modal de entrega
 * (VEI-RD-88c) abre na sequência — sem essa etapa faltaria caminho para
 * imprimir a planilha logo depois de gerar.
 */
@Component({
  selector: 'app-ordem-servico-geracao',
  imports: [
    CommonModule,
    AurumPageHeaderComponent,
    AurumButtonComponent,
    AurumDropdownComponent,
    AurumFilterFieldComponent,
    AurumCheckboxComponent,
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
    OrdemServicoEntregaModalComponent,
  ],
  template: `
    <aurum-page-header
      titulo="Gerar Ordem de Serviço"
      subtitulo="Selecione as peças para gerar a rota e a autorização de colagem do período."
    />

    <div class="og-filtros">
      <aurum-filter-field rotulo="Período" posicaoRotulo="acima">
        <aurum-dropdown [opcoes]="opcoesPeriodicidade" [valor]="String(periodicidade)" (valorChange)="mudarPeriodicidade($event)" />
      </aurum-filter-field>
      <aurum-filter-field rotulo="Selecionar período" posicaoRotulo="acima">
        <aurum-dropdown [opcoes]="opcoesPeriodo" [valor]="idPeriodo === null ? TODOS : String(idPeriodo)" (valorChange)="mudarPeriodo($event)" />
      </aurum-filter-field>
      <aurum-filter-field rotulo="Cidade" posicaoRotulo="acima">
        <aurum-dropdown [opcoes]="opcoesCidade" [valor]="idCidade === null ? TODOS : String(idCidade)" (valorChange)="mudarFiltro('idCidade', $event)" />
      </aurum-filter-field>
      <aurum-filter-field rotulo="Status" posicaoRotulo="acima">
        <aurum-dropdown [opcoes]="opcoesStatus" [valor]="status === null ? TODOS : String(status)" (valorChange)="mudarFiltro('status', $event)" />
      </aurum-filter-field>
      <aurum-button variante="outline" (click)="buscarPecas()">Buscar peças</aurum-button>
    </div>

    <div class="og-opcoes">
      <label class="og-opcao"><aurum-checkbox [marcado]="opcoes.comQuadrosAnteriores" (marcadoChange)="opcoes.comQuadrosAnteriores = $event" rotulo="Com quadros anteriores" /> Com quadros anteriores</label>
      <label class="og-opcao"><aurum-checkbox [marcado]="opcoes.semResumoFinal" (marcadoChange)="opcoes.semResumoFinal = $event" rotulo="Sem resumo final" /> Sem resumo final</label>
      <label class="og-opcao"><aurum-checkbox [marcado]="opcoes.ordemInicial" (marcadoChange)="opcoes.ordemInicial = $event" rotulo="Ordem inicial" /> Ordem inicial</label>
      <label class="og-opcao"><aurum-checkbox [marcado]="opcoes.ordemFinal" (marcadoChange)="opcoes.ordemFinal = $event" rotulo="Ordem final" /> Ordem final</label>
    </div>

    @if (erro) {
      <div class="wl-estado wl-estado--erro">{{ erro }}</div>
    }

    @if (carregandoPecas) {
      <div class="wl-estado wl-estado--carregando">Buscando peças elegíveis…</div>
    }

    @if (!carregandoPecas && buscou && pecas.length === 0) {
      <div class="wl-estado wl-estado--vazio">Nenhuma peça elegível para os filtros selecionados.</div>
    }

    @if (pecas.length > 0) {
      <div class="wl-tabela--rolavel">
        <table aurumTable>
          <thead>
            <tr aurumTableRow>
              <th aurumTableHeaderCell>
                <aurum-checkbox rotulo="Selecionar todas as peças" [marcado]="todasSelecionadas()" [indeterminado]="algumasSelecionadas()" (marcadoChange)="selecionarTodas($event)" />
              </th>
              <th aurumTableHeaderCell>Código</th>
              <th aurumTableHeaderCell>Tabu</th>
              <th aurumTableHeaderCell>Rota</th>
              <th aurumTableHeaderCell>Endereço</th>
              <th aurumTableHeaderCell>Bairro</th>
              <th aurumTableHeaderCell>Campanha Atual</th>
              <th aurumTableHeaderCell>Campanha Anterior</th>
              <th aurumTableHeaderCell>Out</th>
              <th aurumTableHeaderCell>Data Colagem</th>
              <th aurumTableHeaderCell>Serviço</th>
            </tr>
          </thead>
          <tbody>
            @for (peca of pecas; track peca.pecaId) {
              <tr aurumTableRow>
                <td aurumTableCell>
                  <aurum-checkbox [rotulo]="'Selecionar ' + peca.codigo" [marcado]="selecionadas.has(peca.pecaId)" (marcadoChange)="alternarSelecao(peca.pecaId, $event)" />
                </td>
                <td aurumTableCell>{{ peca.codigo }}</td>
                <td aurumTableCell>{{ peca.tabu || '—' }}</td>
                <td aurumTableCell>{{ peca.rota || '—' }}</td>
                <td aurumTableCell>{{ peca.endereco || '—' }}</td>
                <td aurumTableCell>{{ peca.bairro || '—' }}</td>
                <td aurumTableCell>{{ peca.campanhaAtual || '—' }}</td>
                <td aurumTableCell>{{ peca.campanhaAnterior || '—' }}</td>
                <td aurumTableCell>{{ peca.outQtd ?? '—' }}</td>
                <td aurumTableCell>{{ peca.dataColagem || '—' }}</td>
                <td aurumTableCell>{{ peca.servico || '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="og-rodape">
        <span>{{ selecionadas.size }} {{ selecionadas.size === 1 ? 'peça selecionada' : 'peças selecionadas' }}</span>
        <aurum-button [desabilitado]="selecionadas.size === 0 || gerando" (click)="gerarOs()">
          {{ gerando ? 'Gerando…' : 'Gerar Ordem de Serviço' }}
        </aurum-button>
      </div>
    }

    <app-os-entrega-modal
      [aberto]="modalAberto"
      [contexto]="contextoEntrega"
      (fechar)="fecharModalEIrParaDetalhe()"
      (entregue)="fecharModalEIrParaDetalhe()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .og-filtros {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 16px;
        margin-bottom: 16px;
      }
      .og-opcoes {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        margin-bottom: 16px;
      }
      .og-opcao {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 0.875rem;
      }
      .og-rodape {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 0;
      }
    `,
  ],
})
export class OrdemServicoGeracaoComponent implements OnInit {
  private service = inject(OrdemServicoService);
  private lookups = inject(LookupsService);
  private router = inject(Router);

  readonly TODOS = TODOS;
  readonly String = String;

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
  idPeriodo: number | null = null;
  idCidade: number | null = null;
  status: StatusPecaPeriodo | null = null;

  opcoes = { comQuadrosAnteriores: false, semResumoFinal: false, ordemInicial: true, ordemFinal: false };

  pecas: OsPecaElegivel[] = [];
  selecionadas = new Set<number>();
  buscou = false;
  carregandoPecas = false;
  gerando = false;
  erro: string | null = null;

  modalAberto = false;
  contextoEntrega: OsEntregaContexto | null = null;

  ngOnInit(): void {
    this.carregarPeriodos();
    this.lookups.cidades().subscribe({
      next: (cidades) => {
        this.cidadesCarregadas = cidades;
        this.opcoesCidade = [{ valor: TODOS, rotulo: 'Todas' }, ...cidades.map((c) => ({ valor: String(c.id), rotulo: `${c.nome} — ${c.sigla}` }))];
      },
      error: () => (this.cidadesCarregadas = []),
    });
  }

  private carregarPeriodos(): void {
    this.lookups.periodos(this.periodicidade).subscribe({
      next: (periodos) => {
        this.periodosCarregados = periodos;
        this.opcoesPeriodo = [{ valor: TODOS, rotulo: 'Todos' }, ...periodos.map((p) => ({ valor: String(p.id), rotulo: p.nome }))];
      },
      error: () => (this.periodosCarregados = []),
    });
  }

  mudarPeriodicidade(valor: string): void {
    this.periodicidade = Number(valor) as Periodicidade;
    this.idPeriodo = null;
    this.carregarPeriodos();
  }

  mudarPeriodo(valor: string): void {
    this.idPeriodo = valor === TODOS ? null : Number(valor);
  }

  mudarFiltro(campo: 'idCidade' | 'status', valor: string): void {
    const numerico = valor === TODOS ? null : Number(valor);
    if (campo === 'idCidade') this.idCidade = numerico;
    else this.status = numerico;
  }

  buscarPecas(): void {
    this.carregandoPecas = true;
    this.erro = null;
    this.buscou = true;
    this.selecionadas.clear();

    this.service
      .pecasElegiveis({ periodicidade: this.periodicidade, idPeriodo: this.idPeriodo, idCidade: this.idCidade, status: this.status })
      .subscribe({
        next: (pecas) => {
          this.pecas = pecas;
          this.carregandoPecas = false;
        },
        error: (erro: unknown) => {
          this.carregandoPecas = false;
          this.pecas = [];
          this.erro = mensagemDeErro(erro, 'Não foi possível buscar as peças elegíveis.');
        },
      });
  }

  todasSelecionadas(): boolean {
    return this.pecas.length > 0 && this.selecionadas.size === this.pecas.length;
  }

  algumasSelecionadas(): boolean {
    return this.selecionadas.size > 0 && !this.todasSelecionadas();
  }

  selecionarTodas(marcado: boolean): void {
    this.selecionadas = marcado ? new Set(this.pecas.map((p) => p.pecaId)) : new Set();
  }

  alternarSelecao(pecaId: number, marcado: boolean): void {
    if (marcado) this.selecionadas.add(pecaId);
    else this.selecionadas.delete(pecaId);
  }

  gerarOs(): void {
    if (this.selecionadas.size === 0 || this.gerando || !this.idPeriodo) return;

    this.gerando = true;
    this.erro = null;

    this.service
      .criar({ idPeriodo: this.idPeriodo, idsPeca: [...this.selecionadas], opcoes: this.opcoes })
      .subscribe({
        next: (resultado) => {
          this.gerando = false;
          this.contextoEntrega = {
            id: resultado.id,
            numero: resultado.numero,
            pecasCount: resultado.pecasCount,
            periodoNome: resultado.periodoNome,
          };
          this.modalAberto = true;
        },
        error: (erro: unknown) => {
          this.gerando = false;
          this.erro = mensagemDeErro(erro, 'Não foi possível gerar a ordem de serviço.');
        },
      });
  }

  fecharModalEIrParaDetalhe(): void {
    const id = this.contextoEntrega?.id;
    this.modalAberto = false;
    if (id) this.router.navigate(['/ordens-servico', id]);
  }
}
