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
          <rect x="1" y="2" width="14" height="2" fill="currentColor" />
          <rect x="1" y="7" width="14" height="2" fill="currentColor" />
          <rect x="1" y="12" width="14" height="2" fill="currentColor" />
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
          <rect x="1" y="1" width="6" height="6" fill="currentColor" />
          <rect x="9" y="1" width="6" height="6" fill="currentColor" />
          <rect x="1" y="9" width="6" height="6" fill="currentColor" />
          <rect x="9" y="9" width="6" height="6" fill="currentColor" />
        </svg>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-view-selector {
        display: inline-flex;
        border-radius: var(--radius-pill);
        background: var(--surface-muted);
        padding: 4px;
        gap: 4px;
      }
      .aurum-view-selector__btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: var(--radius-pill);
        background: transparent;
        color: var(--on-surface);
        cursor: pointer;
      }
      .aurum-view-selector__btn--ativo {
        background: var(--white);
        color: var(--primary-color);
        box-shadow: var(--shadow-base);
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
    if (persistido) this.modo = persistido;
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
