import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { mensagemDeErro } from '../../core/http/api-error';
import { OsDetalhe, STATUS_OS_ROTULOS } from '../../core/models/wl.models';
import { OrdemServicoService } from '../../core/services/ordem-servico.service';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumCardComponent } from '../../shared/aurum/aurum-card.component';
import { AurumHistoryCardComponent, AurumHistoryEvento } from '../../shared/aurum/aurum-history-card.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent, AurumStatusPillTom } from '../../shared/aurum/aurum-status-pill.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';

/**
 * Ordem de Serviço — detalhe (VEI-RD-88d, Figma `198:546`).
 *
 * `GET /api/wl/ordens-servico/{id}` e `GET /{id}/pdf` (não `/planilha-pdf`)
 * confirmados lendo `OrdensServicoController` real no workspace irmão do
 * BFF, 2026-09-22. `numeroFormatado` já vem pronto ("OS #0042") — sem
 * zero-padding no cliente. Peças não trazem `bairro`/`campanhaAtual` (o BFF
 * não os projeta em `GetById`) — a tabela usa os campos que existem
 * (`localCodigo`/`localDescricao`/`cidade`).
 *
 * **Sem bloco `RESPONSÁVEL (COLADOR)` e sem botão `REATRIBUIR COLADOR`** —
 * regra dura, mesma decisão humana de VEI-RD-88c (2026-09-17): não existe
 * fluxo de atribuição de colador nesta sprint. O Info Card só tem
 * STATUS/PEÇAS NA OS/CRIADA POR.
 *
 * **Sem o contador "N de M peças confirmadas na tela de Colagem"** — ele só
 * teria origem numa tela de Colagem que não existe nesta sprint; `Data
 * Colagem` e `Status Colagem` ficam sempre "—"/"Pendente" na tabela de peças.
 */
@Component({
  selector: 'app-ordem-servico-detalhe',
  imports: [
    CommonModule,
    RouterLink,
    AurumPageHeaderComponent,
    AurumButtonComponent,
    AurumCardComponent,
    AurumStatusPillComponent,
    AurumHistoryCardComponent,
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
  ],
  template: `
    <a class="od-voltar" routerLink="/ordens-servico">← Voltar para Ordem de Serviço</a>

    <aurum-page-header [titulo]="detalhe?.numeroFormatado || 'Ordem de Serviço'">
      @if (detalhe; as os) {
        <aurum-status-pill aurumPageHeaderBadge [rotulo]="rotuloStatus(os.status)" [tom]="tomStatus(os.status)" />
      }
      @if (detalhe; as os) {
        <p aurumPageHeaderSubtitulo class="od-subtitulo">
          {{ os.periodo || '—' }} · {{ os.cidades.join(', ') || '—' }} · gerada em {{ os.dataCadastro | date: 'dd/MM/yyyy HH:mm' }}
        </p>
      }
      @if (detalhe) {
        <aurum-button aurumPageHeaderAcoes variante="outline" tamanho="sm" [desabilitado]="baixando" (click)="baixarPlanilha()">
          {{ baixando ? 'Abrindo…' : 'Baixar planilha (PDF)' }}
        </aurum-button>
      }
    </aurum-page-header>

    @if (carregando) {
      <div class="wl-estado wl-estado--carregando">Carregando a ordem de serviço…</div>
    }

    @if (erro) {
      <div class="wl-estado wl-estado--erro">
        {{ erro }}
        <aurum-button variante="outline" tamanho="sm" (click)="carregar()">Tentar novamente</aurum-button>
      </div>
    }

    @if (erroPlanilha) {
      <div class="wl-estado wl-estado--erro">{{ erroPlanilha }}</div>
    }

    @if (detalhe; as os) {
      <aurum-card class="od-info">
        <div class="od-info__item">
          <span class="od-info__rotulo">Status</span>
          <span class="od-info__valor">{{ rotuloStatus(os.status) }}</span>
        </div>
        <div class="od-info__item">
          <span class="od-info__rotulo">Peças na OS</span>
          <span class="od-info__valor">{{ os.pecas.length }}</span>
        </div>
        <div class="od-info__item">
          <span class="od-info__rotulo">Criada por</span>
          <span class="od-info__valor">{{ os.criadaPor || '—' }}</span>
        </div>
      </aurum-card>

      <section class="od-bloco">
      <h2 class="od-secao-titulo">Peças incluídas nesta OS</h2>
      @if (os.pecas.length === 0) {
        <div class="wl-estado wl-estado--vazio">Nenhuma peça nesta OS.</div>
      } @else {
        <div class="wl-tabela--rolavel">
          <table aurumTable class="aurum-table--densa od-tabela">
            <thead>
              <tr aurumTableRow>
                <th aurumTableHeaderCell>Código</th>
                <th aurumTableHeaderCell>Local</th>
                <th aurumTableHeaderCell>Endereço</th>
                <th aurumTableHeaderCell>Cidade</th>
                <th aurumTableHeaderCell>Data Colagem</th>
                <th aurumTableHeaderCell>Status Colagem</th>
              </tr>
            </thead>
            <tbody>
              @for (peca of os.pecas; track peca.codigo) {
                <tr aurumTableRow>
                  <td aurumTableCell class="od-codigo">{{ peca.codigo }}</td>
                  <td aurumTableCell>{{ peca.localCodigo || '—' }}</td>
                  <td aurumTableCell>{{ peca.localDescricao || '—' }}</td>
                  <td aurumTableCell>{{ peca.cidade || '—' }}</td>
                  <td aurumTableCell>{{ peca.dataColagem || '—' }}</td>
                  <td aurumTableCell><aurum-status-pill [rotulo]="peca.statusColagem" [tom]="peca.statusColagem === 'Concluída' || peca.statusColagem === 'Concluida' ? 'solido-verde' : 'solido-laranja'" /></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      </section>

      <aurum-history-card titulo="Histórico da OS" [eventos]="eventosHistorico(os)" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .od-voltar {
        display: inline-block;
        margin-bottom: 16px;
        color: var(--primary-color);
        font-size: 0.8125rem;
        font-weight: 600;
        text-decoration: none;
      }
      .od-subtitulo {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--on-surface);
      }
      .od-info {
        display: flex;
        flex-wrap: wrap;
        gap: 48px;
        margin-bottom: 20px;
        border-radius: 18px;
      }
      .od-info__item {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .od-info__rotulo {
        font-size: 0.6875rem;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: color-mix(in srgb, var(--on-surface) 75%, transparent);
      }
      .od-info__valor {
        font-size: 0.875rem;
        color: var(--primary-dark);
      }
      .od-bloco {
        margin-bottom: 20px;
        padding: 20px;
        background: var(--white);
        border: 1px solid var(--line-subtle);
        border-radius: 18px;
        box-shadow: var(--shadow-card);
      }
      .od-secao-titulo {
        margin: 0 0 12px;
        font-family: var(--font-ui);
        font-size: 0.9375rem;
        font-weight: 700;
        color: var(--primary-dark);
      }
      .od-tabela {
        border: 0;
        box-shadow: none;
      }
      .od-codigo {
        font-weight: 700;
        color: var(--primary-dark);
      }
    `,
  ],
})
export class OrdemServicoDetalheComponent implements OnInit {
  private service = inject(OrdemServicoService);
  private route = inject(ActivatedRoute);

  detalhe: OsDetalhe | null = null;
  carregando = false;
  erro: string | null = null;

  baixando = false;
  erroPlanilha: string | null = null;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!id || Number.isNaN(id)) {
      this.erro = 'Ordem de serviço não informada.';
      return;
    }

    this.carregando = true;
    this.erro = null;

    this.service.obter(id).subscribe({
      next: (detalhe) => {
        this.detalhe = detalhe;
        this.carregando = false;
      },
      error: (erro: unknown) => {
        this.carregando = false;
        this.erro = mensagemDeErro(erro, 'Não foi possível carregar esta ordem de serviço.');
      },
    });
  }

  tomStatus(status: string): AurumStatusPillTom {
    return ({ Aberta: 'solido-cinza', Atribuida: 'solido-azul', EmExecucao: 'solido-laranja', Concluida: 'solido-verde' } as Record<string, AurumStatusPillTom>)[status] ?? 'neutro';
  }

  rotuloStatus(status: string): string {
    return STATUS_OS_ROTULOS[status] || status;
  }

  /** `aurum-history-card` espera `{evento, timestamp, autor}`; o BFF devolve `{evento, dataHora, usuario}`. */
  eventosHistorico(os: OsDetalhe): AurumHistoryEvento[] {
    return os.historico.map((h) => ({
      evento: h.evento,
      // Mesmo formato das outras telas que usam o cartão de histórico.
      timestamp: new Date(h.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      autor: h.usuario || '—',
    }));
  }

  baixarPlanilha(): void {
    if (this.baixando || !this.detalhe) return;

    this.baixando = true;
    this.erroPlanilha = null;

    this.service.pdf(this.detalhe.id).subscribe({
      next: (blob) => {
        this.baixando = false;
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (erro: unknown) => {
        this.baixando = false;
        // Erro vira mensagem na tela — nunca navega para uma pagina quebrada.
        this.erroPlanilha = mensagemDeErro(erro, 'Não foi possível baixar a planilha desta ordem de serviço.');
      },
    });
  }
}
