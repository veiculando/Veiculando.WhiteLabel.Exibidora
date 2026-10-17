import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { mensagemDeErro } from '../../core/http/api-error';
import {
  CidadeLookup,
  LEGENDA_STATUS_PROGRAMACAO,
  OperadorCampo,
  Periodicidade,
  PERIODICIDADE_ROTULOS,
  PeriodoLookup,
  ProgramacaoGradeItem,
  StatusPecaPeriodo,
} from '../../core/models/wl.models';
import { LookupsService } from '../../core/services/lookups.service';
import { OrdemServicoService } from '../../core/services/ordem-servico.service';
import { ProgramacaoService } from '../../core/services/programacao.service';
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
import { PapelIconeComponent } from './papel-icone.component';

const TODOS = '';
/** Teto do servidor por página (`WlPaginacao.PageSizeMaximo`) — ver aviso quando o filtro tem mais peças do que isso. */
const PAGE_SIZE_MAXIMO = 100;

/**
 * Ordem de Serviço — geração (VEI-RD-88b, Figma `186:86`).
 *
 * "Selecione as peças para gerar a rota e a autorização de colagem do
 * período." Ao confirmar, a OS nasce em `Aberta` e o modal de entrega
 * (VEI-RD-88c) abre na sequência — sem essa etapa faltaria caminho para
 * imprimir a planilha logo depois de gerar.
 *
 * **Sem endpoint dedicado de "peças elegíveis".** `OrdensServicoController`
 * (lido no BFF real, 2026-09-22) não tem `/pecas-elegiveis` — as peças vêm
 * de `POST /api/wl/programacao/listar` (mesmo `ProgramacaoService` de
 * VEI-RD-86), pinando `idPeriodoInicial`/`idPeriodoFinal` no MESMO período
 * escolhido aqui. Colunas Tabu/Rota/Campanha Atual/Campanha Anterior/Out/
 * Serviço não existem nessa resposta (a grade de programação não as
 * projeta) — ficam "—"; só Código/Endereço/Bairro vêm preenchidos.
 *
 * **As 4 opções de exibição não vão para o servidor.**
 * `OrdemServicoCriarRequest` só aceita `IdPeriodo`/`IdPecas` — o PDF é
 * gerado de forma fixa. Os checkboxes continuam na tela por fidelidade ao
 * Figma, mas são só estado local, sem efeito na chamada.
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
    PapelIconeComponent,
  ],
  template: `
    <aurum-page-header
      titulo="Nova ordem de serviço"
      subtitulo="Selecione as peças para gerar a rota e a autorização de colagem do período."
    />

    <section class="og-painel">
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
      <aurum-button variante="outline" tamanho="sm" [desabilitado]="!idPeriodo" (click)="buscarPecas()">Buscar peças</aurum-button>
    </div>

    <div class="og-filtros">
      <aurum-filter-field rotulo="Colador" posicaoRotulo="acima">
        <aurum-dropdown [opcoes]="opcoesColador" [valor]="idColador === null ? TODOS : String(idColador)" (valorChange)="mudarAtribuido('colador', $event)" />
        <app-papel-icone papel="colador" />
      </aurum-filter-field>
      <aurum-filter-field rotulo="Fiscal" posicaoRotulo="acima">
        <aurum-dropdown [opcoes]="opcoesFiscal" [valor]="idFiscal === null ? TODOS : String(idFiscal)" (valorChange)="mudarAtribuido('fiscal', $event)" />
        <app-papel-icone papel="fiscal" />
      </aurum-filter-field>
    </div>

    <div class="og-opcoes">
      <label class="og-opcao"><aurum-checkbox [marcado]="opcoes.comQuadrosAnteriores" (marcadoChange)="opcoes.comQuadrosAnteriores = $event" rotulo="Com quadros anteriores" /> Com quadros anteriores</label>
      <label class="og-opcao"><aurum-checkbox [marcado]="opcoes.semResumoFinal" (marcadoChange)="opcoes.semResumoFinal = $event" rotulo="Sem resumo final" /> Sem resumo final</label>
      <label class="og-opcao"><aurum-checkbox [marcado]="opcoes.ordemInicial" (marcadoChange)="opcoes.ordemInicial = $event" rotulo="Ordem inicial" /> Ordem inicial</label>
      <label class="og-opcao"><aurum-checkbox [marcado]="opcoes.ordemFinal" (marcadoChange)="opcoes.ordemFinal = $event" rotulo="Ordem final" /> Ordem final</label>
    </div>
    </section>

    @if (erro) {
      <div class="wl-estado wl-estado--erro">{{ erro }}</div>
    }

    @if (!idPeriodo) {
      <div class="wl-estado wl-estado--vazio">Escolha um período para buscar as peças.</div>
    }

    @if (carregandoPecas) {
      <div class="wl-estado wl-estado--carregando">Buscando peças…</div>
    }

    @if (!carregandoPecas && buscou && pecas.length === 0) {
      <div class="wl-estado wl-estado--vazio">Nenhuma peça encontrada para os filtros selecionados.</div>
    }

    @if (totalPecas > PAGE_SIZE_MAXIMO) {
      <div class="wl-estado wl-estado--erro" role="note">
        Este período/filtro tem {{ totalPecas }} peças; só as {{ PAGE_SIZE_MAXIMO }} primeiras estão listadas
        abaixo. Refine por cidade ou status para ver o restante.
      </div>
    }

    @if (pecas.length > 0) {
      <div class="wl-tabela--rolavel">
        <table aurumTable class="aurum-table--densa">
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
              <th aurumTableHeaderCell>Campanha atual</th>
              <th aurumTableHeaderCell>Campanha anterior</th>
              <th aurumTableHeaderCell>Out</th>
              <th aurumTableHeaderCell>Data de colagem</th>
              <th aurumTableHeaderCell>Serviço</th>
            </tr>
          </thead>
          <tbody>
            @for (peca of pecas; track peca.pecaId) {
              <tr aurumTableRow>
                <td aurumTableCell>
                  <aurum-checkbox [rotulo]="'Selecionar ' + peca.pecaCodigo" [marcado]="selecionadas.has(peca.pecaId)" (marcadoChange)="alternarSelecao(peca.pecaId, $event)" />
                </td>
                <td aurumTableCell class="og-codigo">{{ peca.pecaCodigo }}</td>
                <td aurumTableCell>—</td>
                <td aurumTableCell>—</td>
                <td aurumTableCell>{{ peca.endereco || '—' }}</td>
                <td aurumTableCell>{{ peca.bairro || '—' }}</td>
                <td aurumTableCell>—</td>
                <td aurumTableCell>—</td>
                <td aurumTableCell>—</td>
                <td aurumTableCell>—</td>
                <td aurumTableCell>—</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="og-rodape">
        <aurum-button variante="outline" [desabilitado]="!osGeradaId || baixando" (click)="imprimirPlanilha()">
          {{ baixando ? 'Abrindo…' : 'Imprimir planilha' }}
        </aurum-button>
        <aurum-button [desabilitado]="selecionadas.size === 0 || gerando" (click)="gerarOs()">
          {{ gerando ? 'Gerando…' : 'Gerar ordem de serviço (' + selecionadas.size + (selecionadas.size === 1 ? ' selecionado)' : ' selecionados)') }}
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
      .og-painel {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 24px;
        padding: 20px;
        background: var(--white);
        border: 1px solid var(--line-subtle);
        border-radius: 18px;
        filter: drop-shadow(0 8px 16px color-mix(in srgb, var(--shadow-tint) 8%, transparent));
      }
      .og-filtros {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 12px;
      }
      .og-opcoes {
        display: flex;
        flex-wrap: wrap;
        gap: 28px;
      }
      .og-opcao {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 0.8125rem;
        color: var(--on-surface);
        cursor: pointer;
      }
      .og-codigo {
        font-weight: 700;
        color: var(--primary-dark);
        white-space: nowrap;
      }
      .og-rodape {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 20px 0;
      }
    `,
  ],
})
export class OrdemServicoGeracaoComponent implements OnInit {
  private ordemServicoService = inject(OrdemServicoService);
  private programacaoService = inject(ProgramacaoService);
  private lookups = inject(LookupsService);
  private router = inject(Router);

  readonly TODOS = TODOS;
  readonly String = String;
  readonly PAGE_SIZE_MAXIMO = PAGE_SIZE_MAXIMO;

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
  opcoesColador: AurumDropdownOpcao[] = [{ valor: TODOS, rotulo: 'Nenhum' }];
  opcoesFiscal: AurumDropdownOpcao[] = [{ valor: TODOS, rotulo: 'Nenhum' }];
  idColador: number | null = null;
  idFiscal: number | null = null;

  private periodosCarregados: PeriodoLookup[] = [];
  private cidadesCarregadas: CidadeLookup[] = [];

  periodicidade: Periodicidade = Periodicidade.Bissemanal;
  idPeriodo: number | null = null;
  idCidade: number | null = null;
  status: StatusPecaPeriodo | null = null;

  opcoes = { comQuadrosAnteriores: false, semResumoFinal: false, ordemInicial: true, ordemFinal: false };

  /** Uma linha por peça, já deduplicada — `programacao/listar` filtrado a um único período devolve no máximo uma célula por peça. */
  pecas: ProgramacaoGradeItem[] = [];
  totalPecas = 0;
  selecionadas = new Set<number>();
  buscou = false;
  carregandoPecas = false;
  gerando = false;
  baixando = false;
  osGeradaId: number | null = null;
  erro: string | null = null;

  modalAberto = false;
  contextoEntrega: OsEntregaContexto | null = null;

  ngOnInit(): void {
    this.carregarPeriodos();
    this.carregarOperadores();
    this.lookups.cidades().subscribe({
      next: (cidades) => {
        this.cidadesCarregadas = cidades;
        this.opcoesCidade = [{ valor: TODOS, rotulo: 'Todas' }, ...cidades.map((c) => ({ valor: String(c.id), rotulo: `${c.nome} — ${c.sigla}` }))];
      },
      error: () => (this.cidadesCarregadas = []),
    });
  }

  carregarOperadores(): void {
    this.ordemServicoService.operadores().subscribe({
      next: (operadores) => {
        this.opcoesColador = this.opcoesDe(operadores, (o) => o.colador);
        this.opcoesFiscal = this.opcoesDe(operadores, (o) => o.fiscal);
      },
      error: () => {
        this.opcoesColador = [{ valor: TODOS, rotulo: 'Nenhum' }];
        this.opcoesFiscal = [{ valor: TODOS, rotulo: 'Nenhum' }];
      },
    });
  }

  private opcoesDe(operadores: OperadorCampo[], papel: (o: OperadorCampo) => boolean): AurumDropdownOpcao[] {
    return [
      { valor: TODOS, rotulo: 'Nenhum' },
      ...operadores.filter(papel).map((o) => ({ valor: String(o.id), rotulo: o.nome })),
    ];
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

  mudarAtribuido(papel: 'colador' | 'fiscal', valor: string): void {
    const id = valor === TODOS ? null : Number(valor);
    if (papel === 'colador') this.idColador = id;
    else this.idFiscal = id;
  }

  mudarFiltro(campo: 'idCidade' | 'status', valor: string): void {
    const numerico = valor === TODOS ? null : Number(valor);
    if (campo === 'idCidade') this.idCidade = numerico;
    else this.status = numerico;
  }

  /** Reusa `ProgramacaoService.listar` (VEI-RD-86) pinando os dois limites do intervalo no mesmo período — não existe endpoint próprio de "peças elegíveis". */
  buscarPecas(): void {
    if (!this.idPeriodo) return;

    this.carregandoPecas = true;
    this.erro = null;
    this.buscou = true;
    this.selecionadas.clear();

    this.programacaoService
      .listar(
        {
          periodicidade: this.periodicidade,
          idPeriodoInicial: this.idPeriodo,
          idPeriodoFinal: this.idPeriodo,
          idCidade: this.idCidade,
          status: this.status,
          anunciante: null,
        },
        { page: 1, pageSize: PAGE_SIZE_MAXIMO }
      )
      .subscribe({
        next: (pagina) => {
          this.pecas = pagina.itens;
          this.totalPecas = pagina.total;
          this.carregandoPecas = false;
        },
        error: (erro: unknown) => {
          this.carregandoPecas = false;
          this.pecas = [];
          this.totalPecas = 0;
          this.erro = mensagemDeErro(erro, 'Não foi possível buscar as peças.');
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

  imprimirPlanilha(): void {
    if (!this.osGeradaId || this.baixando) return;
    this.baixando = true;
    this.erro = null;
    this.ordemServicoService.pdf(this.osGeradaId).subscribe({
      next: (blob) => {
        this.baixando = false;
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (erro: unknown) => {
        this.baixando = false;
        this.erro = mensagemDeErro(erro, 'Não foi possível imprimir a planilha.');
      },
    });
  }

  gerarOs(): void {
    if (this.selecionadas.size === 0 || this.gerando || !this.idPeriodo) return;

    const idPeriodo = this.idPeriodo;
    const periodoNome = this.periodosCarregados.find((p) => p.id === idPeriodo)?.nome ?? null;

    this.gerando = true;
    this.erro = null;

    this.ordemServicoService
      // Só `idPeriodo`/`idPecas` — `OrdemServicoCriarRequest` não tem campo de opções.
      .criar({ idPeriodo, idPecas: [...this.selecionadas], idColador: this.idColador, idFiscal: this.idFiscal })
      .subscribe({
        next: (resultado) => {
          this.gerando = false;
          this.osGeradaId = resultado.id;
          this.contextoEntrega = {
            id: resultado.id,
            numeroFormatado: resultado.numeroFormatado,
            pecasCount: resultado.pecasCount,
            // A resposta de criação não devolve o período — quem chama já
            // sabe qual é (é o mesmo enviado no payload).
            periodoNome,
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
