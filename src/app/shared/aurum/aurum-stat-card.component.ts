import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type AurumStatCardTom = 'vinho' | 'ouro' | 'ambar';
export type AurumStatCardTomRotulo = 'padrao' | 'sucesso' | 'aviso';

/**
 * Cartão de indicador (KPI) do Figma Aurum — Dashboard `153:1265`, Reservas
 * `416:16804`, PIs `154:7083`: rótulo em caixa-alta, ícone num quadrado
 * tingido à direita, valor em Fraunces 26 e uma linha de detalhe.
 *
 * `valor` cobre o caso simples; valores compostos ("14 reservas 9 PIs") vêm
 * projetados em `[aurumStatValor]`. O detalhe é o conteúdo padrão.
 */
@Component({
  selector: 'aurum-stat-card',
  imports: [],
  template: `
    <div class="aurum-stat-card__topo">
      <span [class]="'aurum-stat-card__rotulo aurum-stat-card__rotulo--' + tomRotulo">{{ rotulo }}</span>
      @if (icone) {
        <span [class]="'aurum-stat-card__icone aurum-stat-card__icone--' + tom" aria-hidden="true">
          <span class="aurum-ico" [style.--ico]="'url(/assets/aurum/icon-' + icone + '.svg)'"></span>
        </span>
      }
    </div>
    @if (valor !== null && valor !== '') {
      <span class="aurum-stat-card__valor">{{ valor }}</span>
    }
    <ng-content select="[aurumStatValor]" />
    <div class="aurum-stat-card__detalhe">
      <ng-content />
    </div>
  `,
  host: { class: 'aurum-stat-card' },
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        padding: 20px;
        background: var(--white);
        border: 1px solid var(--line-subtle);
        border-radius: 18px;
        filter: drop-shadow(0 8px 16px rgba(74, 14, 14, 0.1));
      }
      .aurum-stat-card__topo {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .aurum-stat-card__rotulo {
        font-size: 0.78125rem;
        font-weight: 600;
        line-height: 18.75px;
        letter-spacing: 0.625px;
        text-transform: uppercase;
        color: var(--on-surface);
      }
      .aurum-stat-card__rotulo--sucesso {
        color: var(--tone-success);
      }
      .aurum-stat-card__rotulo--aviso {
        color: #b45309;
      }
      .aurum-stat-card__icone {
        display: grid;
        place-items: center;
        flex: none;
        width: 36px;
        height: 36px;
        border-radius: 10px;
      }
      .aurum-stat-card__icone--vinho {
        background: var(--wine-tint);
        color: var(--primary-color);
      }
      .aurum-stat-card__icone--ouro {
        background: color-mix(in srgb, var(--secondary-color) 15%, transparent);
        color: #8a6500;
      }
      .aurum-stat-card__icone--ambar {
        background: rgba(234, 179, 8, 0.12);
        color: #b45309;
      }
      .aurum-stat-card__valor {
        padding-top: 12px;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 1.625rem;
        line-height: 26px;
        font-variation-settings: 'SOFT' 0, 'WONK' 1;
        color: #6e040b;
      }
      .aurum-stat-card__detalhe {
        padding-top: 10px;
        font-size: 0.75rem;
        line-height: 18px;
        color: var(--on-surface);
      }
      .aurum-stat-card__detalhe:empty {
        display: none;
      }
    `,
  ],
})
export class AurumStatCardComponent {
  @Input() rotulo = '';
  @Input() valor: string | number | null = null;
  /** Nome do ícone em `assets/aurum/icon-<icone>.svg`; vazio omite o quadrado. */
  @Input() icone = '';
  @Input() tom: AurumStatCardTom = 'vinho';
  /** Rótulo colorido dos mini-dashboards ("EM VEICULAÇÃO" verde, "PENDENTES" âmbar). */
  @Input() tomRotulo: AurumStatCardTomRotulo = 'padrao';
}
