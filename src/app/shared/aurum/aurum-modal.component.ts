import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type AurumModalLargura = 'sm' | 'md' | 'lg';
export type AurumModalPosicao = 'centro' | 'lateral';

let proximoId = 0;

/**
 * Diálogo do Figma Aurum — painel branco 20px de raio, título Fraunces 20
 * bold, "×" no canto e rodapé com ações à direita (`419:21489`,
 * `187:1364`). `posicao="lateral"` é a gaveta de altura total à direita
 * usada em Alterar Preço (`419:23870`).
 *
 * Mesma mecânica dos modais que já existiam nas telas: renderiza só quando
 * `aberto`, clique no fundo ou Esc emitem `fechar` — quem hospeda decide.
 * Corpo via `<ng-content>`; ações via `[aurumModalRodape]`.
 */
@Component({
  selector: 'aurum-modal',
  imports: [],
  template: `
    @if (aberto) {
      <div class="aurum-modal__fundo" [class.aurum-modal__fundo--lateral]="posicao === 'lateral'" (click)="fechar.emit()">
        <div
          [class]="'aurum-modal aurum-modal--' + largura + ' aurum-modal--' + posicao"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="idTitulo"
          (click)="$event.stopPropagation()"
          (keydown.escape)="fechar.emit()"
        >
          <button type="button" class="aurum-modal__fechar" aria-label="Fechar" (click)="fechar.emit()">
            <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </button>
          <header class="aurum-modal__cabecalho">
            <h2 class="aurum-modal__titulo" [id]="idTitulo">{{ titulo }}</h2>
            @if (subtitulo) {
              <p class="aurum-modal__subtitulo">{{ subtitulo }}</p>
            }
            <ng-content select="[aurumModalSubtitulo]" />
          </header>
          <div class="aurum-modal__corpo">
            <ng-content />
          </div>
          <footer class="aurum-modal__rodape">
            <ng-content select="[aurumModalRodape]" />
          </footer>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-modal__fundo {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background: color-mix(in srgb, var(--charcoal) 55%, transparent);
      }
      .aurum-modal__fundo--lateral {
        justify-content: flex-end;
        align-items: stretch;
        padding: 0;
      }
      .aurum-modal {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
        max-height: calc(100vh - 32px);
        overflow-y: auto;
        background: var(--white);
        border-radius: var(--radius-modal);
        box-shadow: var(--shadow-modal);
        padding: 28px;
      }
      .aurum-modal--sm { max-width: 420px; }
      .aurum-modal--md { max-width: 580px; }
      .aurum-modal--lg { max-width: 720px; }
      .aurum-modal--lateral {
        max-width: 480px;
        max-height: none;
        border-radius: 0;
      }
      .aurum-modal__fechar {
        position: absolute;
        top: 20px;
        right: 20px;
        display: inline-flex;
        border: none;
        background: transparent;
        color: var(--on-surface);
        cursor: pointer;
        padding: 0;
      }
      .aurum-modal__cabecalho {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-right: 32px;
      }
      .aurum-modal__titulo {
        margin: 0;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 1.25rem;
        line-height: 1.5;
        letter-spacing: 0;
        color: var(--primary-dark);
      }
      .aurum-modal__subtitulo {
        margin: 0;
        font-size: 0.78125rem;
        color: var(--on-surface);
      }
      .aurum-modal__corpo {
        flex: 1;
      }
      .aurum-modal__rodape {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding-top: 16px;
        border-top: 1px solid var(--line-search);
      }
      .aurum-modal__rodape:empty {
        display: none;
      }
    `,
  ],
})
export class AurumModalComponent {
  @Input() aberto = false;
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input() largura: AurumModalLargura = 'md';
  @Input() posicao: AurumModalPosicao = 'centro';

  @Output() fechar = new EventEmitter<void>();

  readonly idTitulo = `aurum-modal-titulo-${++proximoId}`;
}
