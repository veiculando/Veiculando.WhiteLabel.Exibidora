import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface AurumChipOpcao<T = string> {
  valor: T;
  rotulo: string;
}

/**
 * Grupo de filtros em pílula — "Status: Todos | Ativo | Inativo" do Figma
 * Aurum (`226:6963`, Filter Status Group). Seleção única; a opção ativa fica
 * vinho com texto papel, as demais em cinza translúcido.
 *
 * Puramente de apresentação: quem hospeda decide o que o valor filtra.
 */
@Component({
  selector: 'aurum-chip-group',
  imports: [],
  template: `
    <div class="aurum-chip-group" role="radiogroup" [attr.aria-label]="rotulo || null">
      @if (rotulo) {
        <span class="aurum-chip-group__prefixo">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
            <path d="M2 3h12l-4.6 5.4V13l-2.8-1.4V8.4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
          </svg>
          {{ rotulo }}:
        </span>
      }
      @for (opcao of opcoes; track opcao.valor) {
        <button
          type="button"
          role="radio"
          class="aurum-chip-group__chip"
          [class.aurum-chip-group__chip--ativo]="opcao.valor === valor"
          [attr.aria-checked]="opcao.valor === valor"
          (click)="selecionar(opcao.valor)"
        >
          {{ opcao.rotulo }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-chip-group {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .aurum-chip-group__prefixo {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding-right: 4px;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--on-surface);
      }
      .aurum-chip-group__prefixo svg {
        color: var(--primary-color);
      }
      .aurum-chip-group__chip {
        border: none;
        border-radius: var(--radius-pill);
        padding: 8px 16px;
        background: var(--chip-bg);
        color: var(--on-surface);
        font-size: 0.8125rem;
        font-weight: 600;
        line-height: normal;
        white-space: nowrap;
        cursor: pointer;
      }
      .aurum-chip-group__chip:hover {
        background: rgba(0, 0, 0, 0.08);
      }
      .aurum-chip-group__chip--ativo,
      .aurum-chip-group__chip--ativo:hover {
        background: var(--primary-color);
        color: var(--paper-bg);
      }
    `,
  ],
})
export class AurumChipGroupComponent<T = string> {
  @Input() opcoes: AurumChipOpcao<T>[] = [];
  @Input() valor!: T;
  /** Prefixo com ícone de filtro ("Status"). Vazio omite o prefixo. */
  @Input() rotulo = '';

  @Output() valorChange = new EventEmitter<T>();

  selecionar(valor: T): void {
    if (valor === this.valor) return;
    this.valor = valor;
    this.valorChange.emit(valor);
  }
}
