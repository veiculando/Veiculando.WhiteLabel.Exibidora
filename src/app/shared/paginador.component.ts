import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Rodapé de paginação das listagens.
 *
 * Existe em três telas (PIs, reservas, programação) com o mesmo comportamento;
 * triplicar o markup faria as três divergirem no primeiro ajuste.
 *
 * O componente é burro de propósito: não conhece a fonte dos dados, só emite a
 * página pedida. Quem carrega é a tela, que é quem sabe o filtro em vigor.
 */
@Component({
  selector: 'app-paginador',
  imports: [],
  template: `
    @if (total > 0) {
      <div class="wl-paginador">
        <span class="wl-paginador__resumo">
          {{ primeiroDaPagina }}–{{ ultimoDaPagina }} de {{ total }}
        </span>

        <div class="wl-paginador__acoes">
          <button
            class="wl-btn wl-btn--secundario"
            type="button"
            [disabled]="page <= 1 || carregando"
            (click)="irPara(page - 1)"
          >
            Anterior
          </button>

          <span class="wl-paginador__pagina">Página {{ page }} de {{ totalPaginas }}</span>

          <button
            class="wl-btn wl-btn--secundario"
            type="button"
            [disabled]="page >= totalPaginas || carregando"
            (click)="irPara(page + 1)"
          >
            Próxima
          </button>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .wl-paginador {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 0;
        flex-wrap: wrap;
      }
      .wl-paginador__resumo,
      .wl-paginador__pagina {
        font-size: 0.875rem;
      }
      .wl-paginador__acoes {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    `,
  ],
})
export class PaginadorComponent {
  @Input() page = 1;
  @Input() pageSize = 25;
  @Input() total = 0;
  @Input() totalPaginas = 0;
  @Input() carregando = false;

  @Output() pagina = new EventEmitter<number>();

  get primeiroDaPagina(): number {
    return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get ultimoDaPagina(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  irPara(destino: number): void {
    if (destino < 1 || destino > this.totalPaginas || destino === this.page) return;
    this.pagina.emit(destino);
  }
}
