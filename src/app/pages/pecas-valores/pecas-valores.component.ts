import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  RowDataUpdatedEvent,
  SelectionChangedEvent,
} from 'ag-grid-community';
import { mensagemDeErro } from '../../core/http/api-error';
import {
  AlteracaoValorTipo,
  CidadeLookup,
  NomeadoLookup,
  PecaValorListItem,
  PecasAlterarValoresRequest,
  PecasAlterarValoresSazonaisRequest,
} from '../../core/models/wl.models';
import { LookupsService } from '../../core/services/lookups.service';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumTextInputComponent } from '../../shared/aurum/aurum-text-input.component';
import { AurumFilterBarComponent } from '../../shared/aurum/aurum-filter-bar.component';
import { AurumModalComponent } from '../../shared/aurum/aurum-modal.component';
import { PermissionService } from '../../core/auth/permission.service';
import { PaginadorComponent } from '../../shared/paginador.component';
import { STATUS_EXIBICAO_LABEL, StatusExibicao } from '../locais/models/status-exibicao.enum';
import {
  AlterarPrecoConfirmacao,
  PecasAlterarPrecoModalComponent,
} from './pecas-alterar-preco-modal.component';
import { PecaValoresService } from './services/peca-valores.service';

/**
 * Valores de Peças (VEI-RD-54) — Figma `154:3004`.
 *
 * Nota de escopo (plano tático Ordem 5, seção 3): o título original do card
 * dizia "ag-Grid com edição inline". O Figma e o PRD §5.4 usam tabela com
 * SELEÇÃO por checkbox + modal de alteração em LOTE — é este o modelo
 * implementado aqui. ag-Grid segue sendo a grade (já era dependência), mas a
 * edição é em lote via modal, não inline.
 */
/** Suporte como etiqueta (Figma `154:3004`); texto via textContent, nunca HTML. */
function etiquetaSuporte(params: { value?: string | null }): HTMLElement | string {
  if (!params.value) return '';
  const etiqueta = document.createElement('span');
  etiqueta.className = 'aurum-cel-tag';
  etiqueta.textContent = params.value;
  return etiqueta;
}

@Component({
  selector: 'app-pecas-valores',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgGridAngular,
    AurumPageHeaderComponent,
    AurumButtonComponent,
    AurumFilterBarComponent,
    AurumModalComponent,
    AurumTextInputComponent,
    PaginadorComponent,
    PecasAlterarPrecoModalComponent,
  ],
  templateUrl: './pecas-valores.component.html',
  styles: [
    `
      .pv-ico {
        width: 16px;
        height: 16px;
      }
      .pv-grid-wrapper {
        height: 560px;
        margin-bottom: 8px;
      }
      .pv-sucesso {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        text-align: center;
      }
      .pv-sucesso__icone {
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        border: 2px solid var(--tone-success);
        border-radius: 50%;
        color: var(--tone-success);
      }
      .pv-sucesso h2 {
        margin: 8px 0 0;
        font-size: 1.25rem;
        font-weight: 700;
      }
      .pv-sucesso p {
        margin: 0 0 12px;
        font-size: 0.8125rem;
        color: var(--on-surface);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class PecasValoresComponent implements OnInit {
  private readonly service = inject(PecaValoresService);
  private readonly lookups = inject(LookupsService);
  readonly afiliadaId = inject(PermissionService).getAfiliadaId();

  @ViewChild(AgGridAngular) grid?: AgGridAngular;
  private gridApi?: GridApi<PecaValorListItem>;

  itens: PecaValorListItem[] = [];
  cidades: CidadeLookup[] = [];
  suportes: NomeadoLookup[] = [];

  readonly statusLabel = STATUS_EXIBICAO_LABEL;
  readonly StatusExibicao = StatusExibicao;

  busca = '';
  idCidade: number | null = null;
  idTipoSuporte: number | null = null;
  status: StatusExibicao | null = StatusExibicao.Ativo;

  carregando = false;
  erro: string | null = null;

  page = 1;
  pageSize = 25;
  total = 0;
  totalPaginas = 0;

  /**
   * Linhas selecionadas por id — preservadas entre páginas, já que o ag-Grid
   * perde a seleção quando `rowData` troca. Guarda a LINHA inteira (não só o
   * id) para o modal poder montar a prévia de impacto (valor atual total)
   * mesmo com peças selecionadas em páginas diferentes da atual.
   */
  private readonly selecionados = new Map<number, PecaValorListItem>();
  selecionadosCount = 0;

  modalAberto = false;
  salvandoModal = false;
  erroModal: string | null = null;
  sucesso = '';

  readonly colDefs: ColDef<PecaValorListItem>[] = [
    { headerCheckboxSelection: true, checkboxSelection: true, width: 44, pinned: 'left', sortable: false, resizable: false },
    { headerName: 'Código', field: 'codigo', sortable: true, flex: 1.1, cellClass: 'aurum-cel-codigo' },
    { headerName: 'Código Interno', field: 'codigoInterno', sortable: false, flex: 1, cellClass: 'aurum-cel-mono' },
    { headerName: 'Suporte', field: 'suporte', sortable: false, flex: 1, cellRenderer: etiquetaSuporte },
    { headerName: 'Cidade', field: 'cidade', sortable: true, flex: 1, cellClass: 'aurum-cel-forte' },
    { headerName: 'Endereço', field: 'endereco', sortable: false, flex: 1.4, cellClass: 'aurum-cel-apagado' },
    {
      headerName: 'Valor Padrão',
      field: 'valorPadrao',
      sortable: true,
      flex: 1,
      type: 'rightAligned',
      cellClass: 'aurum-cel-valor',
      // Sem centavos, como o Figma ("R$ 18.500"); o modal mostra o valor exato.
      valueFormatter: (params) =>
        typeof params.value === 'number'
          ? params.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
          : '',
    },
  ];

  readonly defaultColDef: ColDef = { resizable: true };

  readonly getRowId = (params: GetRowIdParams<PecaValorListItem>): string => params.data.id.toString();

  ngOnInit(): void {
    this.lookups.cidades().subscribe({ next: (c) => (this.cidades = c), error: () => (this.cidades = []) });
    this.lookups.suportes().subscribe({ next: (s) => (this.suportes = s), error: () => (this.suportes = []) });
    this.carregar();
  }

  onGridReady(event: GridReadyEvent<PecaValorListItem>): void {
    this.gridApi = event.api;
    this.restaurarSelecao();
  }

  onRowDataUpdated(_event: RowDataUpdatedEvent<PecaValorListItem>): void {
    this.restaurarSelecao();
  }

  onSelectionChanged(_event: SelectionChangedEvent<PecaValorListItem>): void {
    if (!this.gridApi) return;
    // Atualiza o mapa global a partir do que está marcado NESTA página, sem
    // perder o que foi marcado em páginas anteriores.
    for (const item of this.itens) this.selecionados.delete(item.id);
    for (const linha of this.gridApi.getSelectedRows()) this.selecionados.set(linha.id, linha);
    this.selecionadosCount = this.selecionados.size;
  }

  private restaurarSelecao(): void {
    if (!this.gridApi) return;
    this.gridApi.forEachNode((node) => {
      if (node.data) node.setSelected(this.selecionados.has(node.data.id), false);
    });
  }

  aplicarFiltro(): void {
    this.carregar(1);
  }

  carregar(page = this.page): void {
    this.carregando = true;
    this.erro = null;

    this.service
      .listar(
        {
          idCidade: this.idCidade,
          idTipoSuporte: this.idTipoSuporte,
          status: this.status,
          busca: this.busca,
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
          this.itens = [];
          this.total = 0;
          this.totalPaginas = 0;
          this.carregando = false;
          this.erro = mensagemDeErro(erro, 'Não foi possível carregar os valores de peças.');
        },
      });
  }

  abrirModal(): void {
    if (this.selecionadosCount === 0) return;
    this.erroModal = null;
    this.modalAberto = true;
  }

  fecharModal(): void {
    this.modalAberto = false;
  }

  confirmarAlteracao(confirmacao: AlterarPrecoConfirmacao): void {
    this.salvandoModal = true;
    this.erroModal = null;

    const pecasIds = [...this.selecionados.keys()];

    if (confirmacao.modo === 'padrao') {
      const request: PecasAlterarValoresRequest = {
        pecasIds,
        valor: confirmacao.valor,
        tipoValor: confirmacao.tipoValor as AlteracaoValorTipo,
      };
      this.service.alterar(request).subscribe({
        next: (resultado) => {
          this.salvandoModal = false;
          this.modalAberto = false;
          this.sucesso = `Preços atualizados com sucesso para ${resultado.quantidadeAfetada} ${resultado.quantidadeAfetada === 1 ? 'peça' : 'peças'}!`;
          this.limparSelecaoErecarregar();
        },
        error: (erro: unknown) => {
          this.salvandoModal = false;
          this.erroModal = mensagemDeErro(erro, 'Não foi possível alterar os valores.');
        },
      });
    } else {
      const request: PecasAlterarValoresSazonaisRequest = {
        pecasIds,
        periodosValor: [{ idPeriodo: confirmacao.idPeriodo!, valor: confirmacao.valor }],
      };
      this.service.alterarSazonais(request).subscribe({
        next: () => {
          this.salvandoModal = false;
          this.modalAberto = false;
          this.sucesso = `Valor sazonal aplicado com sucesso a ${pecasIds.length} ${pecasIds.length === 1 ? 'peça' : 'peças'}!`;
          this.limparSelecaoErecarregar();
        },
        error: (erro: unknown) => {
          this.salvandoModal = false;
          this.erroModal = mensagemDeErro(erro, 'Não foi possível alterar os valores sazonais.');
        },
      });
    }
  }

  private limparSelecaoErecarregar(): void {
    this.selecionados.clear();
    this.selecionadosCount = 0;
    this.carregar(this.page);
  }

  itensSelecionados(): PecaValorListItem[] {
    return [...this.selecionados.values()];
  }
}
