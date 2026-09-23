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
import { AurumStatusPillComponent, AurumStatusPillTom } from '../../shared/aurum/aurum-status-pill.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';
import { AurumTextInputComponent } from '../../shared/aurum/aurum-text-input.component';
import { AurumViewSelectorComponent, AurumViewSelectorModo } from '../../shared/aurum/aurum-view-selector.component';
import { AurumChipGroupComponent } from '../../shared/aurum/aurum-chip-group.component';
import { AurumCodeComponent } from '../../shared/aurum/aurum-code.component';
import { AurumFilterBarComponent } from '../../shared/aurum/aurum-filter-bar.component';
import { PermissionService } from '../../core/auth/permission.service';

type Aba = 'todos' | StatusExibicao.Ativo | StatusExibicao.Inativo | StatusExibicao.AprovacaoPendente;

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: StatusExibicao.Ativo, rotulo: 'Ativo' },
  { valor: StatusExibicao.Inativo, rotulo: 'Inativo' },
  { valor: StatusExibicao.AprovacaoPendente, rotulo: 'Aprovação pendente' },
];

/**
 * Gestão de Locais e Pontos OOH (VEI-RD-87) — Figma `226:6963` (lista) e
 * `154:2276` (cartões). Filtro de status em pílulas dentro da barra de
 * filtros, como no Figma; a lista mantém as ações que o frame não desenha
 * (+ Peça, Inativar/Reativar/Cancelar cadastro).
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
    AurumChipGroupComponent,
    AurumCodeComponent,
    AurumFilterBarComponent,
  ],
  templateUrl: './locais.component.html',
  styles: [
    `
      .locais__subtitulo {
        margin: 0;
        font-size: 0.875rem;
        color: var(--on-surface);
      }
      .locais__ico-mais {
        width: 16px;
        height: 16px;
      }
      .locais__ico-editar {
        width: 12px;
        height: 12px;
      }
      .locais__endereco,
      .locais__card-titulo {
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 0.9375rem;
        font-variation-settings: 'SOFT' 0, 'WONK' 1;
        color: var(--primary-dark);
      }
      .locais__local {
        margin-top: 4px;
        font-size: 0.8125rem;
        color: var(--on-surface);
      }
      .locais__tipo {
        font-size: 0.8125rem;
        color: var(--on-surface);
        min-width: 200px;
      }
      .locais__tipo div + div {
        margin-top: 4px;
      }
      .locais__direita {
        text-align: right;
      }
      .locais__centro {
        text-align: center;
      }
      .locais__valor,
      .locais__card-valor {
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 0.9375rem;
        font-variation-settings: 'SOFT' 0, 'WONK' 1;
        color: var(--primary-dark);
        white-space: nowrap;
      }
      .locais__periodicidade,
      .locais__card-rotulo {
        font-size: 0.625rem;
        font-weight: 600;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        color: var(--on-surface);
      }
      .locais__acoes {
        display: flex;
        align-items: center;
        flex-direction: column;
        justify-content: center;
        gap: 6px;
        white-space: nowrap;
      }
      .locais__card-rodape .locais__acoes {
        flex-direction: row;
      }
      .locais__cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
      }
      .locais__card {
        display: flex;
        flex-direction: column;
        padding: 20px;
        background: var(--white);
        border: 1px solid var(--line-subtle);
        border-radius: var(--radius-card);
        box-shadow: var(--shadow-card);
      }
      .locais__card-topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 10px;
      }
      .locais__card-titulo {
        margin: 0;
        font-size: 1.0625rem;
      }
      .locais__card-info {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin: 14px 0;
        padding: 12px;
        border-radius: var(--radius-search);
        background: var(--paper-bg);
        font-size: 0.78125rem;
        color: var(--on-surface);
      }
      .locais__card-info div {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .locais__card-info .aurum-ico {
        width: 13px;
        height: 13px;
        color: var(--primary-color);
      }
      .locais__card-info strong {
        color: var(--primary-dark);
      }
      .locais__card-rodape {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
        margin-top: auto;
        padding-top: 12px;
        border-top: 1px solid var(--line-search);
      }
      .locais__card-valor {
        font-size: 1.0625rem;
      }
      .locais__sem-peca {
        font-family: var(--font-ui);
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--on-surface);
      }
    `,
  ],
})
export class LocaisComponent implements OnInit {
  private readonly localService = inject(LocalService);
  private readonly branding = inject(BrandingService);
  readonly afiliadaId = inject(PermissionService).getAfiliadaId();

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

  tomStatus(status: StatusExibicao): AurumStatusPillTom {
    return status === StatusExibicao.Ativo ? 'sucesso' : status === StatusExibicao.AprovacaoPendente ? 'aviso' : 'neutro';
  }

  /** "Cidade - UF", como a segunda linha do endereço no Figma. */
  localidade(local: LocalListItem): string {
    return [local.cidade, local.uf].filter(Boolean).join(' - ') || '—';
  }

  /** `pt-BR` explícito e sem centavos, como o Figma ("R$ 18.500"). */
  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
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
