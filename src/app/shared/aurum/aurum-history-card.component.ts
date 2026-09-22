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
        background: var(--white);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        padding: 16px;
      }
      .aurum-history-card__titulo {
        margin: 0 0 12px;
        font-size: 1rem;
      }
      .aurum-history-card__vazio {
        margin: 0;
        color: var(--on-surface);
        font-size: 0.875rem;
      }
      .aurum-history-card__lista {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .aurum-history-card__item {
        border-left: 2px solid var(--divider);
        padding-left: 12px;
      }
      .aurum-history-card__evento {
        margin: 0;
        color: var(--charcoal);
        font-size: 0.875rem;
      }
      .aurum-history-card__meta {
        margin: 2px 0 0;
        color: var(--on-surface);
        font-size: 0.75rem;
      }
    `,
  ],
})
export class AurumHistoryCardComponent {
  @Input() titulo = '';
  @Input() eventos: AurumHistoryEvento[] = [];
}
