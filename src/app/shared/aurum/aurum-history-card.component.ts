import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface AurumHistoryEvento {
  evento: string;
  timestamp: string;
  autor: string;
}

/**
 * Histórico append-only — consumido por VEI-RD-88 (OS), 81 (KYC) e 82
 * (config). Só lista o que recebe, na ordem recebida: quem decide a ordem e
 * garante o append-only é o backend, aqui é puramente exibição.
 */
@Component({
  selector: 'aurum-history-card',
  imports: [],
  template: `
    <div class="aurum-history-card">
      @if (titulo) {
        <h3 class="aurum-history-card__titulo">{{ titulo }}</h3>
      }
      @if (eventos.length === 0) {
        <p class="aurum-history-card__vazio">Nenhum evento registrado ainda.</p>
      } @else {
        <ol class="aurum-history-card__lista">
          @for (item of eventos; track item.timestamp + item.evento) {
            <li class="aurum-history-card__item">
              <p class="aurum-history-card__evento">{{ item.evento }}</p>
              <p class="aurum-history-card__meta">{{ item.timestamp }} · {{ item.autor }}</p>
            </li>
          }
        </ol>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-history-card {
        padding: 20px 24px;
        background: var(--white);
        border: 1px solid var(--line-subtle);
        border-radius: 18px;
        box-shadow: var(--shadow-card);
      }
      .aurum-history-card__titulo {
        margin: 0 0 14px;
        font-size: 1rem;
        font-weight: 700;
      }
      .aurum-history-card__vazio {
        margin: 0;
        color: var(--on-surface);
        font-size: 0.8125rem;
      }
      .aurum-history-card__lista {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .aurum-history-card__item {
        border-left: 2px solid color-mix(in srgb, var(--secondary-color) 60%, transparent);
        padding-left: 12px;
      }
      .aurum-history-card__evento {
        margin: 0;
        color: var(--charcoal);
        font-size: 0.8125rem;
        font-weight: 600;
      }
      .aurum-history-card__meta {
        margin: 2px 0 0;
        color: color-mix(in srgb, var(--on-surface) 75%, transparent);
        font-size: 0.6875rem;
      }
    `,
  ],
})
export class AurumHistoryCardComponent {
  @Input() titulo = '';
  @Input() eventos: AurumHistoryEvento[] = [];
}
