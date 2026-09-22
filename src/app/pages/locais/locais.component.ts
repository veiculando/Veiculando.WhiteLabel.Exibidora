import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalService } from './services/local.service';
import { LocalListItem, PERIODICIDADE_LABEL } from './models/local.model';
import { mensagemDeErro } from '../../core/http/api-error';
import { STATUS_EXIBICAO_LABEL, StatusExibicao } from './models/status-exibicao.enum';
import { BrandingService } from '../../core/branding/branding.service';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent } from '../../shared/aurum/aurum-status-pill.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';
import { AurumTextInputComponent } from '../../shared/aurum/aurum-text-input.component';
import { AurumViewSelectorComponent, AurumViewSelectorModo } from '../../shared/aurum/aurum-view-selector.component';
import { AurumCardComponent } from '../../shared/aurum/aurum-card.component';

type Aba = 'todos' | StatusExibicao.Ativo | StatusExibicao.Inativo | StatusExibicao.AprovacaoPendente;

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: StatusExibicao.Ativo, rotulo: 'Ativo' },
  { valor: StatusExibicao.Inativo, rotulo: 'Inativo' },
  { valor: StatusExibicao.AprovacaoPendente, rotulo: 'Aprovação pendente' },
];

/**
 * Gestão de Locais e Pontos OOH (VEI-RD-87) — Figma `226:7569` (listagem,
 * dentro do frame mal nomeado "Tipos de Suporte - Lista") + `154:2549`.
 *
 * A afiliada exibida é sempre a resolvida pelo Host — este componente
 * jamais filtra ou envia um AfiliadaId próprio (ADR-WL-008); o subtítulo só
 * EXIBE o nome (via `BrandingService`), nunca oferece seletor.
 *
 * GET /api/wl/locais não pagina nem filtra por querystring — busca e abas de
 * status são aplicadas em memória sobre o que já foi carregado, como antes.
 */
@Component({
  selector: 'app-locais',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    AurumPageHeaderComponent,
    AurumButtonComponent,
    AurumStatusPillComponent,
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
    AurumTextInputComponent,
    AurumViewSelectorComponent,
    AurumCardComponent,
  ],
  templateUrl: './locais.component.html',
  styles: [
    `
      .locais__toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .locais__abas {
        display: flex;
        gap: 4px;
        border-bottom: 1px solid var(--border);
        margin-bottom: 16px;
      }
      .locais__aba {
        border: none;
        background: none;
        padding: 10px 14px;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--on-surface);
        cursor: pointer;
        border-bottom: 2px solid transparent;
      }
      .locais__aba--ativa {
        color: var(--primary-color);
        border-bottom-color: var(--primary-color);
      }
      .locais__acoes {
        display: flex;
        align-items: center;
        gap: 12px;
        white-space: nowrap;
      }
      .locais__link {
        color: var(--primary-color);
        text-decoration: none;
      }
      .locais__link:hover {
        text-decoration: underline;
      }
      .locais__link-primario {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-pill);
        padding: 10px 20px;
        font-size: 0.8125rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        background: var(--primary-color);
        color: var(--white);
        text-decoration: none;
        box-shadow: var(--shadow-base);
      }
      .locais__link-primario:hover {
        background: var(--primary-dark);
        box-shadow: var(--shadow-hover);
      }
      .locais__cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 16px;
      }
      .locais__card {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .locais__card-codigo {
        font-weight: 700;
      }
      .locais__card-linha {
        font-size: 0.8125rem;
        color: var(--on-surface);
      }
      .locais__card-acoes {
        margin-top: 8px;
        display: flex;
        gap: 12px;
      }
    `,
  ],
})
export class LocaisComponent implements OnInit {
  private readonly localService = inject(LocalService);
  private readonly branding = inject(BrandingService);

  private todosOsLocais: LocalListItem[] = [];
  private termoBusca = '';

  readonly locais = signal<LocalListItem[]>([]);
  readonly carregando = signal(false);
  readonly excluindoId = signal<number | null>(null);
  readonly erro = signal(false);
  readonly erroAcao = signal('');
  readonly sucesso = signal('');
  readonly statusLabel = STATUS_EXIBICAO_LABEL;
  readonly periodicidadeLabel = PERIODICIDADE_LABEL;
  readonly StatusExibicao = StatusExibicao;

  readonly abas = ABAS;
  abaAtiva: Aba = 'todos';
  modoVisualizacao: AurumViewSelectorModo = 'lista';

  get nomeAfiliada(): string | null {
    return this.branding.branding()?.nomeExibicao ?? null;
  }

  ngOnInit(): void {
    this.carregar();
  }

  selecionarAba(aba: Aba): void {
    this.abaAtiva = aba;
    this.filtrar();
  }

  buscar(termo: string): void {
    this.termoBusca = termo.trim().toLowerCase();
    this.filtrar();
  }

  private filtrar(): void {
    let itens = this.todosOsLocais;

    if (this.abaAtiva !== 'todos') {
      itens = itens.filter((local) => local.statusExibicao === this.abaAtiva);
    }

    if (this.termoBusca) {
      itens = itens.filter((local) =>
        [local.codigo, local.descricao, local.cidade, local.suporte]
          .filter((campo): campo is string => !!campo)
          .some((campo) => campo.toLowerCase().includes(this.termoBusca))
      );
    }

    this.locais.set(itens);
  }

  excluir(local: LocalListItem): void {
    if (this.excluindoId() !== null) return;
    const acao = this.rotuloAcao(local);
    if (!window.confirm(`${acao}: ${local.codigo}?${local.statusExibicao === StatusExibicao.Inativo ? ' O local voltará a aguardar aprovação.' : ''}`)) {
      return;
    }

    this.excluindoId.set(local.id);
    this.erroAcao.set('');
    this.sucesso.set('');
    const operacao = local.statusExibicao === StatusExibicao.Ativo ? 'inativar'
      : local.statusExibicao === StatusExibicao.Inativo ? 'reativar' : 'cancelar';
    this.localService.alterarStatus(local.id, operacao, local.timeStamp).subscribe({
      next: () => {
        this.excluindoId.set(null);
        this.sucesso.set('Situação do local atualizada.');
        this.carregar();
      },
      error: err => {
        this.excluindoId.set(null);
        this.erroAcao.set(mensagemDeErro(err));
      },
    });
  }

  rotuloAcao(local: LocalListItem): string {
    return local.statusExibicao === StatusExibicao.Ativo ? 'Inativar'
      : local.statusExibicao === StatusExibicao.Inativo ? 'Reativar' : 'Cancelar cadastro';
  }

  private carregar(): void {
    this.carregando.set(true);
    this.erro.set(false);

    this.localService.listLocais().subscribe({
      next: (locais) => {
        this.todosOsLocais = locais;
        this.filtrar();
        this.carregando.set(false);
      },
      error: () => {
        // Nunca exibe dados parciais/estado anterior em caso de falha.
        this.todosOsLocais = [];
        this.locais.set([]);
        this.carregando.set(false);
        this.erro.set(true);
      },
    });
  }
}
