import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { mensagemDeErro } from '../../core/http/api-error';
import { CheckoutDetalhe, TOM_STATUS_PEDIDO_INSERCAO } from '../../core/models/wl.models';
import { CheckoutService } from '../../core/services/checkout.service';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumCardComponent } from '../../shared/aurum/aurum-card.component';
import { AurumHistoryCardComponent } from '../../shared/aurum/aurum-history-card.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent } from '../../shared/aurum/aurum-status-pill.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';

/**
 * Check out — detalhe (VEI-RD-91, Figma `184:501`).
 *
 * **VEI-RD-91d (pendência não decidida — regra dura desta sprint): os
 * botões "Aprovar Checking"/"Recusar Checking" NÃO são renderizados.** Não
 * existe estado `desabilitado` para eles nem um placeholder — ficam fora do
 * DOM inteiramente. Um controle que existe e não funciona ensina errado ao
 * usuário; a tela é somente leitura até essa decisão fechar.
 */
@Component({
  selector: 'app-checkout-detalhe',
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
    <aurum-page-header [titulo]="'Check out — ' + (detalhe?.codigo || '')" subtitulo="Situação de checking desta PI.">
      <a aurumPageHeaderAcoes class="cd-voltar" routerLink="/checkout">← Voltar para o check out</a>
    </aurum-page-header>

    @if (carregando) {
      <div class="wl-estado wl-estado--carregando">Carregando a PI…</div>
    }

    @if (erro) {
      <div class="wl-estado wl-estado--erro">
        {{ erro }}
        <aurum-button variante="ghost" (click)="carregar()">Tentar novamente</aurum-button>
      </div>
    }

    @if (detalhe; as pi) {
      <aurum-card class="cd-resumo">
        <div class="cd-resumo__linha">
          <span><strong>Campanha:</strong> {{ pi.campanha || '—' }}</span>
          <span><strong>Anunciante:</strong> {{ pi.anunciante || '—' }}</span>
          <span><strong>Cidade:</strong> {{ pi.cidade || '—' }}</span>
          <span><strong>Status:</strong> <aurum-status-pill [rotulo]="pi.status" [tom]="tomStatus(pi.status)" /></span>
        </div>
      </aurum-card>

      @if (pi.itens.length === 0) {
        <div class="wl-estado wl-estado--vazio">Esta PI não tem itens de checking.</div>
      }

      @if (pi.itens.length > 0) {
        <div class="wl-tabela--rolavel">
          <table aurumTable>
            <thead>
              <tr aurumTableRow>
                <th aurumTableHeaderCell>Foto</th>
                <th aurumTableHeaderCell>Código</th>
                <th aurumTableHeaderCell>Endereço</th>
                <th aurumTableHeaderCell>Status do item</th>
                <th aurumTableHeaderCell>Status do checking</th>
                <th aurumTableHeaderCell>Fotos recebidas</th>
              </tr>
            </thead>
            <tbody>
              @for (item of pi.itens; track item.idPedidoItem) {
                <tr aurumTableRow>
                  <td aurumTableCell>
                    @if (item.fotoUrl) {
                      <img class="cd-foto" [src]="item.fotoUrl" [alt]="'Foto da peça ' + (item.pecaCodigo || '')" />
                    } @else {
                      <span class="cd-foto cd-foto--vazia" aria-hidden="true">—</span>
                    }
                  </td>
                  <td aurumTableCell>{{ item.pecaCodigo || '—' }}</td>
                  <td aurumTableCell>
                    {{ item.endereco || '—' }}
                    @if (item.enderecoMapaUrl) {
                      <a class="cd-mapa" [href]="item.enderecoMapaUrl" target="_blank" rel="noopener">Ver no mapa</a>
                    }
                  </td>
                  <td aurumTableCell>{{ item.statusItem || '—' }}</td>
                  <td aurumTableCell>{{ item.statusChecking || '—' }}</td>
                  <td aurumTableCell>
                    @if (item.fotosRecebidas.length === 0) {
                      <span class="vazio">Nenhuma foto recebida</span>
                    } @else {
                      <div class="cd-fotos-recebidas">
                        @for (foto of item.fotosRecebidas; track foto.url) {
                          <a [href]="foto.url" target="_blank" rel="noopener" [title]="'Recebida em ' + foto.dataEnvio">
                            <img [src]="foto.url" [alt]="'Foto recebida em ' + foto.dataEnvio" />
                          </a>
                        }
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @for (item of pi.itens; track item.idPedidoItem) {
          @if (item.historicoAvaliacao.length > 0) {
            <aurum-history-card
              [titulo]="'Histórico de avaliação — ' + (item.pecaCodigo || item.idPedidoItem)"
              [eventos]="item.historicoAvaliacao"
            />
          }
        }
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .cd-voltar {
        color: var(--primary-color);
        text-decoration: none;
        font-size: 0.875rem;
      }
      .cd-voltar:hover {
        text-decoration: underline;
      }
      .cd-resumo {
        margin-bottom: 16px;
      }
      .cd-resumo__linha {
        display: flex;
        flex-wrap: wrap;
        gap: 24px;
        align-items: center;
      }
      .cd-foto {
        width: 40px;
        height: 40px;
        object-fit: cover;
        border-radius: var(--radius-sm);
        display: inline-flex;
      }
      .cd-foto--vazia {
        align-items: center;
        justify-content: center;
        background: var(--surface-muted);
        color: var(--on-surface);
      }
      .cd-mapa {
        margin-left: 8px;
        color: var(--primary-color);
        font-size: 0.8125rem;
        text-decoration: none;
      }
      .cd-mapa:hover {
        text-decoration: underline;
      }
      .cd-fotos-recebidas {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .cd-fotos-recebidas img {
        width: 32px;
        height: 32px;
        object-fit: cover;
        border-radius: var(--radius-sm);
      }
      .vazio {
        color: color-mix(in srgb, var(--on-surface) 50%, transparent);
      }
    `,
  ],
})
export class CheckoutDetalheComponent implements OnInit {
  private service = inject(CheckoutService);
  private route = inject(ActivatedRoute);

  detalhe: CheckoutDetalhe | null = null;
  carregando = false;
  erro: string | null = null;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    const codigo = this.route.snapshot.paramMap.get('codigo');
    if (!codigo) {
      this.erro = 'PI não informada.';
      return;
    }

    this.carregando = true;
    this.erro = null;

    this.service.obter(codigo).subscribe({
      next: (detalhe) => {
        this.detalhe = detalhe;
        this.carregando = false;
      },
      error: (erro: unknown) => {
        this.carregando = false;
        this.erro = mensagemDeErro(erro, 'Não foi possível carregar esta PI.');
      },
    });
  }

  tomStatus(status: string): 'neutro' | 'sucesso' | 'aviso' | 'perigo' | 'primario' {
    return TOM_STATUS_PEDIDO_INSERCAO[status] ?? 'neutro';
  }
}
