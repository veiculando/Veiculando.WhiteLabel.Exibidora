import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CampanhasService } from '../../core/services/comercial.service';
import { CampanhaListItem, CampanhaPeriodo } from '../../core/models/comercial.models';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumCodeComponent } from '../../shared/aurum/aurum-code.component';
import { AurumFilterBarComponent } from '../../shared/aurum/aurum-filter-bar.component';
import { AurumModalComponent } from '../../shared/aurum/aurum-modal.component';
import { PermissionService } from '../../core/auth/permission.service';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent, AurumStatusPillTom } from '../../shared/aurum/aurum-status-pill.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';
import { AurumTextInputComponent } from '../../shared/aurum/aurum-text-input.component';
import {
  AurumViewSelectorComponent,
  AurumViewSelectorModo,
} from '../../shared/aurum/aurum-view-selector.component';

/**
 * Campanhas de Mídia — VEI-RD-51, frame `154:5942`. **Módulo consultivo.**
 *
 * Nenhum controle mutável é renderizado: não existe "Nova Campanha", editar, excluir,
 * upload nem aprovar. Eles são OMITIDOS do DOM, não desabilitados (invariante #8) —
 * um botão `disabled` ainda promete a ação e volta a funcionar com uma linha de
 * DevTools; o que não existe no DOM não tem essa ambiguidade. O servidor concorda:
 * `CampanhasController` não declara verbo de mutação nenhum.
 *
 * O design chegou à mesma conclusão de forma independente: badge "Módulo Consultivo"
 * e nenhum botão de mutação em lugar nenhum do frame.
 */
@Component({
  selector: 'app-campanhas',
  imports: [
    FormsModule,
    AurumPageHeaderComponent,
    AurumButtonComponent,
    AurumCodeComponent,
    AurumFilterBarComponent,
    AurumModalComponent,
    AurumTextInputComponent,
    AurumStatusPillComponent,
    AurumViewSelectorComponent,
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
  ],
  templateUrl: './campanhas.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .campanhas__chips { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .campanhas__prefixo { display: inline-flex; align-items: center; gap: 6px; padding-right: 4px; font-size: 0.8125rem; font-weight: 600; color: var(--on-surface); }
      .campanhas__prefixo .aurum-ico { width: 14px; height: 14px; color: var(--primary-color); }
      .campanhas__chip { border: none; border-radius: var(--radius-pill); padding: 8px 16px; background: var(--chip-bg); color: var(--on-surface); font: inherit; font-size: 0.8125rem; font-weight: 600; cursor: pointer; }
      .campanhas__chip[aria-pressed='true'] { background: var(--primary-color); color: var(--paper-bg); }
      .campanhas__cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
      .campanhas__card { display: flex; flex-direction: column; padding: 20px; background: var(--white); border: 1px solid var(--line-subtle); border-radius: var(--radius-card); box-shadow: var(--shadow-card); }
      .campanhas__topo { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
      .campanhas__nome { margin: 0 0 12px; font-size: 1.0625rem; font-weight: 700; line-height: 1.35; }
      .campanhas__info { display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: var(--radius-search); background: var(--paper-bg); font-size: 0.75rem; color: var(--on-surface); }
      .campanhas__info p { display: flex; align-items: flex-start; gap: 6px; margin: 0; }
      .campanhas__info .aurum-ico { width: 13px; height: 13px; margin-top: 2px; color: var(--primary-color); }
      .campanhas__info strong { color: var(--primary-dark); }
      .campanhas__rodape { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-top: auto; padding-top: 14px; border-top: 1px solid var(--line-search); }
      .campanhas__rotulo { display: block; font-size: 0.625rem; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; color: var(--on-surface); }
      .campanhas__valor { font-family: var(--font-display); font-weight: 700; font-size: 1.0625rem; color: var(--primary-dark); white-space: nowrap; }
      .campanhas__celula-nome { font-weight: 700; color: var(--primary-dark); }
      .campanhas__modal-sub { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin-top: 6px; font-size: 0.78125rem; color: var(--on-surface); }
      .campanhas__resumo { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 16px; border-radius: 12px; background: var(--paper-bg); }
      .campanhas__resumo span { display: block; font-size: 0.6875rem; text-transform: uppercase; color: var(--on-surface); }
      .campanhas__resumo strong { font-size: 0.8125rem; color: var(--primary-dark); }
      .campanhas__pecas { margin: 16px 0 0; font-size: 0.8125rem; font-weight: 600; color: var(--primary-dark); }
    `,
  ],
})
export class CampanhasComponent implements OnInit {
  private serv = inject(CampanhasService);

  campanhas: CampanhaListItem[] = [];
  total = 0;
  carregando = false;
  erro = '';

  busca = '';
  status = '';
  /** Visão card é a desenhada; a de lista foi derivada — colunas a confirmar com o design. */
  modo: AurumViewSelectorModo = 'card';

  readonly chips = ['Todos', 'Ativa', 'Agendada', 'Encerrada', 'Cancelada'];

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.erro = '';
    this.serv.listar({ status: this.status || undefined, nome: this.busca || undefined }).subscribe({
      next: (pagina) => {
        this.campanhas = pagina.Itens;
        this.total = pagina.Total;
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Não foi possível carregar as campanhas.';
        this.carregando = false;
      },
    });
  }

  selecionarChip(chip: string): void {
    this.status = chip === 'Todos' ? '' : chip;
    this.carregar();
  }

  chipAtivo(chip: string): boolean {
    return chip === 'Todos' ? this.status === '' : this.status === chip;
  }

  /**
   * Agência vazia é "Venda Direta (Sem Agência)", nunca travessão (invariante #12).
   * Venda sem agência não é ausência de agência — é a agência-espelho da exibidora.
   */
  agencia(campanha: CampanhaListItem): string {
    return campanha.Agencia || 'Venda Direta (Sem Agência)';
  }

  /**
   * Rótulo E intervalo: `Bissemana 16 — 2026 (03/08/2026 - 16/08/2026)`.
   * Só o rótulo não diz quando; só o intervalo não diz qual período comercial é.
   */
  periodo(periodo: CampanhaPeriodo | null): string {
    if (!periodo) return '—';
    const inicio = new Date(periodo.DataInicio).toLocaleDateString('pt-BR');
    const fim = new Date(periodo.DataFim).toLocaleDateString('pt-BR');
    return `${periodo.Codigo} (${inicio} - ${fim})`;
  }

  valor(campanha: CampanhaListItem): string {
    return campanha.ValorTotal.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  /** Campanha aberta no modal consultivo (Figma `416:16188`). */
  detalhe: CampanhaListItem | null = null;
  readonly afiliadaId = inject(PermissionService).getAfiliadaId();
  private buscaTimer?: ReturnType<typeof setTimeout>;

  /** Busca ao digitar, com espera curta — o Figma não tem botão "Aplicar". */
  buscar(termo: string): void {
    this.busca = termo;
    clearTimeout(this.buscaTimer);
    this.buscaTimer = setTimeout(() => this.carregar(), 300);
  }

  tomStatus(status: number): AurumStatusPillTom {
    return (['neutro', 'sucesso', 'aviso', 'neutro', 'perigo'] as AurumStatusPillTom[])[status] ?? 'neutro';
  }

  rotuloStatus(status: number): string {
    return ['Rascunho', 'Ativa', 'Agendada', 'Encerrada', 'Cancelada'][status] ?? 'Campanha';
  }
}
