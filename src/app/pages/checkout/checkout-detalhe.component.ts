import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { mensagemDeErro } from '../../core/http/api-error';
import { CheckoutDetalhe, CheckoutFoto, TOM_STATUS_CHECKING } from '../../core/models/wl.models';
import { CheckoutService } from '../../core/services/checkout.service';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';
import { AurumStatusPillComponent } from '../../shared/aurum/aurum-status-pill.component';

/**
 * Check out — detalhe (VEI-RD-91, Figma `184:501`).
 *
 * `GET /api/wl/checking/{id:int}` (confirmado lendo `CheckingController.GetById`
 * real no workspace irmão do BFF, 2026-09-22) — `id` é o int do checking, não
 * um código de PI.
 *
 * **Sem `historicoAvaliacao[]` como timeline.** O "histórico de avaliação"
 * real é o estado ATUAL de cada FOTO (`itens[].fotos[]`): o domínio
 * (`CheckingFoto.AvaliarFoto`) sobrescreve o estado anterior, não guarda
 * quem avaliou nem avaliações passadas — documentado no próprio controller.
 * A tela renderiza um card por foto (status/nota/observações/geolocalização),
 * não uma timeline append-only.
 *
 * **Sem `enderecoMapaUrl` do backend.** O link "Ver no mapa" é montado no
 * cliente (busca textual do Google Maps a partir de `localDescricao`/
 * `cidade`), já que o BFF não devolve um campo pronto para isso.
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
    AurumStatusPillComponent,
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
  ],
  template: `
    <a class="cd-voltar" routerLink="/checkout">← Voltar para o check out</a>

    @if (carregando) {
      <div class="wl-estado wl-estado--carregando">Carregando o checking…</div>
    }

    @if (erro) {
      <div class="wl-estado wl-estado--erro">
        {{ erro }}
        <aurum-button variante="outline" tamanho="sm" (click)="carregar()">Tentar novamente</aurum-button>
      </div>
    }

    @if (erroFoto) {
      <div class="wl-estado wl-estado--erro">{{ erroFoto }}</div>
    }

    @if (detalhe; as ck) {
      <aurum-page-header
        [titulo]="(ck.piCodigo || '#' + ck.id) + (ck.anunciante ? '/' + ck.anunciante : '')"
        subtitulo="Detalhe do checking de campo, fotos recebidas e avaliação de colagem."
      >
        <aurum-status-pill aurumPageHeaderBadge [rotulo]="ck.status" [tom]="tomStatus(ck.status)" />
      </aurum-page-header>

      <section class="cd-info">
        <h2>Informações da PI</h2>
        <div class="cd-info__colunas">
          <div>
            <span class="cd-info__rotulo">Dados do anunciante</span>
            <p>{{ ck.anunciante || '—' }}</p>
          </div>
          <div>
            <span class="cd-info__rotulo">Dados da campanha</span>
            <p>{{ ck.campanha || '—' }}</p>
          </div>
          <div>
            <span class="cd-info__rotulo">Checking</span>
            <p>Aberto em {{ ck.dataCadastro | date: 'dd/MM/yyyy' }}</p>
            @if (ck.dataAtualizacao) {
              <p>Atualizado em {{ ck.dataAtualizacao | date: 'dd/MM/yyyy' }}</p>
            }
          </div>
        </div>
      </section>

      <h2 class="cd-secao">Peças da PI</h2>

      @if (ck.itens.length === 0) {
        <div class="wl-estado wl-estado--vazio">Este checking não tem itens.</div>
      } @else {
        <div class="wl-tabela--rolavel">
          <table aurumTable class="aurum-table--densa">
            <thead>
              <tr aurumTableRow>
                <th aurumTableHeaderCell>Código</th>
                <th aurumTableHeaderCell>Endereço</th>
                <th aurumTableHeaderCell>Período</th>
                <th aurumTableHeaderCell>Status do item</th>
                <th aurumTableHeaderCell class="cd-centro">Qtd. fotos</th>
              </tr>
            </thead>
            <tbody>
              @for (item of ck.itens; track item.idPedidoItem) {
                <tr aurumTableRow>
                  <td aurumTableCell class="cd-codigo">{{ item.pecaCodigo || '—' }}</td>
                  <td aurumTableCell>
                    <span class="cd-endereco">
                      {{ item.localDescricao || item.localCodigo || '—' }} — {{ item.cidade || '—' }}
                      @if (linkMapa(item); as mapa) {
                        <a class="cd-mapa" [href]="mapa" target="_blank" rel="noopener">📍 mapa</a>
                      }
                    </span>
                  </td>
                  <td aurumTableCell>{{ item.periodo || '—' }}</td>
                  <td aurumTableCell><aurum-status-pill [rotulo]="item.status" [tom]="tomStatus(item.status)" /></td>
                  <td aurumTableCell class="cd-centro cd-codigo">{{ item.fotos.length }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <h2 class="cd-secao">Fotos recebidas</h2>
        @for (item of ck.itens; track item.idPedidoItem) {
          @if (item.fotos.length > 0) {
            <div class="cd-grupo">
              <span class="cd-grupo__titulo">{{ item.pecaCodigo || '—' }}</span>
              <div class="cd-fotos">
                @for (foto of item.fotos; track foto.id) {
                  <div class="cd-foto-card">
                    <div class="cd-foto-card__topo">
                      <aurum-status-pill [rotulo]="foto.status" [tom]="tomStatus(foto.status)" />
                      <aurum-button variante="outline" tamanho="xs" [desabilitado]="abrindoFoto === foto.id" (click)="abrirFoto(foto)">
                        {{ abrindoFoto === foto.id ? 'Abrindo…' : 'Ver foto' }}
                      </aurum-button>
                    </div>
                    @if (foto.nota != null) {
                      <span>Nota: {{ foto.nota }}</span>
                    }
                    @if (foto.observacaoAvaliacao) {
                      <span>Avaliação: {{ foto.observacaoAvaliacao }}</span>
                    }
                    @if (foto.observacaoPublicacao) {
                      <span>Publicação: {{ foto.observacaoPublicacao }}</span>
                    }
                    <span>
                      Geolocalização:
                      @if (foto.geolocalizacao) {
                        {{ foto.geolocalizacao.latitude }}, {{ foto.geolocalizacao.longitude }}
                      } @else {
                        não registrada
                      }
                    </span>
                    @if (foto.distanciaPeca != null) {
                      <span>Distância da peça: {{ foto.distanciaPeca }}m</span>
                    }
                    <span class="cd-foto-card__meta">
                      Enviada em {{ foto.enviadaEm | date: 'dd/MM/yyyy HH:mm' }}
                      @if (foto.avaliadaEm) {
                        · avaliada em {{ foto.avaliadaEm | date: 'dd/MM/yyyy HH:mm' }}
                      }
                    </span>
                  </div>
                }
              </div>
            </div>
          }
        }
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .cd-voltar {
        display: inline-block;
        margin-bottom: 16px;
        color: var(--primary-color);
        font-size: 0.8125rem;
        font-weight: 600;
        text-decoration: none;
      }
      .cd-info {
        margin-bottom: 28px;
        padding: 24px;
        background: var(--white);
        border: 1px solid var(--line-subtle);
        border-radius: 18px;
        filter: drop-shadow(0 8px 16px rgba(74, 14, 14, 0.08));
      }
      .cd-info h2,
      .cd-secao {
        margin: 0 0 16px;
        font-family: var(--font-ui);
        font-size: 0.9375rem;
        font-weight: 700;
        color: var(--primary-dark);
      }
      .cd-info__colunas {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
      }
      .cd-info__rotulo {
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: var(--tone-warning);
      }
      .cd-info p {
        margin: 8px 0 0;
        font-size: 0.8125rem;
        color: var(--charcoal);
      }
      .cd-codigo {
        font-weight: 700;
        color: var(--primary-dark);
      }
      .cd-centro {
        text-align: center;
      }
      .cd-endereco {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        color: var(--on-surface);
      }
      .cd-mapa {
        color: var(--primary-color);
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
        text-decoration: none;
      }
      .cd-secao {
        margin-top: 8px;
      }
      .wl-tabela--rolavel + .cd-secao {
        margin-top: 28px;
      }
      .cd-grupo {
        margin-bottom: 20px;
      }
      .cd-grupo__titulo {
        display: block;
        margin-bottom: 8px;
        font-size: 0.8125rem;
        font-weight: 700;
        color: var(--primary-dark);
      }
      .cd-fotos {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 12px;
      }
      .cd-foto-card {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 14px;
        background: var(--white);
        border: 1px solid var(--line-subtle);
        border-radius: 12px;
        font-size: 0.78125rem;
        color: var(--on-surface);
      }
      .cd-foto-card__topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .cd-foto-card__meta {
        margin-top: 4px;
        font-size: 0.6875rem;
        color: color-mix(in srgb, var(--on-surface) 70%, transparent);
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

  abrindoFoto: number | null = null;
  erroFoto: string | null = null;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!id || Number.isNaN(id)) {
      this.erro = 'Checking não informado.';
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
        this.erro = mensagemDeErro(erro, 'Não foi possível carregar este checking.');
      },
    });
  }

  tomStatus(status: string): 'neutro' | 'sucesso' | 'aviso' | 'perigo' | 'primario' | 'info' {
    return TOM_STATUS_CHECKING[status] ?? 'neutro';
  }

  /** Busca textual do Google Maps — o BFF não devolve um link de mapa pronto. */
  linkMapa(item: { localDescricao: string | null; cidade: string | null }): string | null {
    const texto = [item.localDescricao, item.cidade].filter(Boolean).join(', ');
    if (!texto) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto)}`;
  }

  /**
   * `downloadUrl` exige o Bearer do operador (mesma policy do controller) —
   * um `<img src>`/`<a href>` direto não carregaria o token e voltaria 401.
   * Mesmo padrão de `abrirPdf` em Pedidos de Inserção: baixa como blob pelo
   * HttpClient (que passa pelo interceptor de JWT) e abre numa aba nova.
   */
  abrirFoto(foto: CheckoutFoto): void {
    if (this.abrindoFoto) return;

    this.abrindoFoto = foto.id;
    this.erroFoto = null;

    this.service.baixarFoto(foto.downloadUrl).subscribe({
      next: (blob) => {
        this.abrindoFoto = null;
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (erro: unknown) => {
        this.abrindoFoto = null;
        this.erroFoto = mensagemDeErro(erro, 'Não foi possível abrir esta foto agora.');
      },
    });
  }
}
