import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

export type AurumViewSelectorModo = 'lista' | 'card';

/**
 * Alternador segmentado lista/cartão — frame `233:12627`.
 *
 * Componente único reaproveitado pelas quatro telas que o Humano decidiu
 * (Locais, Anunciantes, Agências, Campanhas — VEI-RD-87/46/79/51): nunca
 * fazer fork por tela. É puramente de apresentação — não sabe de filtro,
 * ordenação, paginação nem de onde os dados vêm; quem o hospeda decide o
 * que renderizar para cada `modo`, sem refazer a consulta ao alternar.
 *
 * A preferência persiste em localStorage por `storageKey` (a rota que o
 * hospeda), não no banco — não é dado de negócio (ADR-WL — decisão do
 * Humano, 2026-09-16).
 */
@Component({
  selector: 'aurum-view-selector',
  imports: [],
  template: `
    <div
      class="aurum-view-selector"
      role="radiogroup"
      aria-label="Modo de visualização"
      (keydown)="aoTeclado($event)"
    >
      <button
        type="button"
        role="radio"
        class="aurum-view-selector__btn"
        [class.aurum-view-selector__btn--ativo]="modo === 'lista'"
        [attr.aria-checked]="modo === 'lista'"
        aria-label="Visualizar em lista"
        (click)="selecionar('lista')"
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
          <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor" />
          <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor" />
          <rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        role="radio"
        class="aurum-view-selector__btn"
        [class.aurum-view-selector__btn--ativo]="modo === 'card'"
        [attr.aria-checked]="modo === 'card'"
        aria-label="Visualizar em cartões"
        (click)="selecionar('card')"
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
          <rect x="2.5" y="2.5" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="8.5" y="2.5" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="2.5" y="8.5" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="8.5" y="8.5" width="5" height="5" rx="1" fill="currentColor" />
        </svg>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-view-selector {
        display: inline-flex;
        gap: 4px;
      }
      .aurum-view-selector__btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 6px;
        background: var(--chip-bg);
        color: var(--on-surface);
        cursor: pointer;
      }
      .aurum-view-selector__btn--ativo {
        background: var(--primary-color);
        color: var(--white);
      }
    `,
  ],
})
export class AurumViewSelectorComponent implements OnInit {
  @Input() storageKey!: string;
  @Input() modo: AurumViewSelectorModo = 'lista';

  @Output() modoChange = new EventEmitter<AurumViewSelectorModo>();

  ngOnInit(): void {
    const persistido = this.lerPersistido();
    if (persistido && persistido !== this.modo) {
      this.modo = persistido;
      // Quem hospeda decide o que renderizar pelo modo: sem avisar, a tela
      // abria em lista com o botão de cartão marcado. Emitido após o ciclo
      // atual para não alterar o pai durante a verificação dele.
      queueMicrotask(() => this.modoChange.emit(persistido));
    }
  }

  selecionar(modo: AurumViewSelectorModo): void {
    if (modo === this.modo) return;
    this.modo = modo;
    this.persistir(modo);
    this.modoChange.emit(modo);
  }

  aoTeclado(event: KeyboardEvent): void {
    const teclasNavegacao = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!teclasNavegacao.includes(event.key)) return;
    event.preventDefault();
    this.selecionar(this.modo === 'lista' ? 'card' : 'lista');
  }

  private chaveStorage(): string {
    return `aurum-view-selector:${this.storageKey}`;
  }

  private lerPersistido(): AurumViewSelectorModo | null {
    try {
      const valor = localStorage.getItem(this.chaveStorage());
      return valor === 'lista' || valor === 'card' ? valor : null;
    } catch {
      return null;
    }
  }

  private persistir(modo: AurumViewSelectorModo): void {
    try {
      localStorage.setItem(this.chaveStorage(), modo);
    } catch {
      // Storage indisponível (ex.: navegação privada) — a alternância
      // continua funcionando na sessão atual, só não persiste.
    }
  }
}
