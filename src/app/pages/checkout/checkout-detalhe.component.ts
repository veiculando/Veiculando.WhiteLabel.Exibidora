import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { mensagemDeErro } from '../../core/http/api-error';
import { CheckoutDetalhe, CheckoutFoto, TOM_STATUS_CHECKING } from '../../core/models/wl.models';
import { CheckoutService } from '../../core/services/checkout.service';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumCardComponent } from '../../shared/aurum/aurum-card.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
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
    AurumCardComponent,
    AurumStatusPillComponent,
  ],
  template: `
    <aurum-page-header [titulo]="'Check out — ' + (detalhe?.piCodigo || ('#' + (detalhe?.id || '')))" subtitulo="Situação de checking desta PI.">
      <a aurumPageHeaderAcoes class="cd-voltar" routerLink="/checkout">← Voltar para o check out</a>
    </aurum-page-header>

    @if (carregando) {
      <div class="wl-estado wl-estado--carregando">Carregando o checking…</div>
    }

    @if (erro) {
      <div class="wl-estado wl-estado--erro">
        {{ erro }}
        <aurum-button variante="ghost" (click)="carregar()">Tentar novamente</aurum-button>
      </div>
    }

    @if (erroFoto) {
      <div class="wl-estado wl-estado--erro">{{ erroFoto }}</div>
    }

    @if (detalhe; as ck) {
      <aurum-card class="cd-resumo">
        <div class="cd-resumo__linha">
          <span><strong>Campanha:</strong> {{ ck.campanha || '—' }}</span>
          <span><strong>Anunciante:</strong> {{ ck.anunciante || '—' }}</span>
          <span><strong>Status:</strong> <aurum-status-pill [rotulo]="ck.status" [tom]="tomStatus(ck.status)" /></span>
        </div>
      </aurum-card>

      @if (ck.itens.length === 0) {
        <div class="wl-estado wl-estado--vazio">Este checking não tem itens.</div>
      }

      @for (item of ck.itens; track item.idPedidoItem) {
        <aurum-card class="cd-item">
          <div class="cd-item__cabecalho">
            <span class="cd-item__codigo">{{ item.pecaCodigo || '—' }}</span>
            <aurum-status-pill [rotulo]="item.status" tom="neutro" />
          </div>
          <div class="cd-item__linha">
            <span>{{ item.localDescricao || item.localCodigo || '—' }} — {{ item.cidade || '—' }}</span>
            @if (linkMapa(item); as mapa) {
              <a class="cd-mapa" [href]="mapa" target="_blank" rel="noopener">Ver no mapa</a>
            }
          </div>
          <span class="cd-item__periodo">{{ item.periodo || '—' }}</span>

          @if (item.fotos.length === 0) {
            <p class="vazio">Nenhuma foto enviada.</p>
          } @else {
            <div class="cd-fotos">
              @for (foto of item.fotos; track foto.id) {
                <div class="cd-foto-card">
                  <div class="cd-foto-card__topo">
                    <aurum-status-pill [rotulo]="foto.status" [tom]="tomStatus(foto.status)" />
                    <aurum-button variante="ghost" [desabilitado]="abrindoFoto === foto.id" (click)="abrirFoto(foto)">
                      {{ abrindoFoto === foto.id ? 'Abrindo…' : 'Ver foto' }}
                    </aurum-button>
                  </div>
                  @if (foto.nota !== null) {
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
                  @if (foto.distanciaPeca !== null) {
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
          }
        </aurum-card>
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
      .cd-item {
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .cd-item__cabecalho {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .cd-item__codigo {
        font-weight: 600;
      }
      .cd-item__linha {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.875rem;
      }
      .cd-item__periodo {
        font-size: 0.8125rem;
        color: var(--on-surface);
      }
      .cd-mapa {
        color: var(--primary-color);
        font-size: 0.8125rem;
        text-decoration: none;
      }
      .cd-mapa:hover {
        text-decoration: underline;
      }
      .cd-fotos {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 12px;
      }
      .cd-foto-card {
        display: flex;
        flex-direction: column;
        gap: 4px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 12px;
        font-size: 0.8125rem;
      }
      .cd-foto-card__topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .cd-foto-card__meta {
        color: var(--on-surface);
        font-size: 0.75rem;
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

  tomStatus(status: string): 'neutro' | 'sucesso' | 'aviso' | 'perigo' | 'primario' {
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
