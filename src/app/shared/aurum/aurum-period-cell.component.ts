import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Cor sólida de cada status oficial da grade (PRD §5.10, Figma `184:1117`):
 * Solicitado laranja, Reservado azul, Autorizado roxo, Faturado verde,
 * Indisponível cinza. Status fora da lista fica neutro.
 */
export function tomDoStatusProgramacao(status: string): string | null {
  const chave = status.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
  return ['solicitado', 'reservado', 'autorizado', 'faturado', 'indisponivel'].includes(chave) ? chave : null;
}

/**
 * Célula de status de peça×período na grade de Programação (consumido por
 * VEI-RD-86): pílula sólida na cor do status. O Figma destaca o período
 * corrente na coluna inteira, então isso fica com quem hospeda a grade.
 */
@Component({
  selector: 'aurum-period-cell',
  imports: [],
  template: `
    <span class="aurum-period-cell" [attr.data-status]="status" [attr.data-tom]="tomDoStatus(status)">
      {{ status }}
      @if (atual) {
        <span class="aurum-period-cell__atual"> (período atual: ATUAL)</span>
      }
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-period-cell {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 84px;
        padding: 5px 12px;
        border-radius: var(--radius-pill);
        background: var(--tom, var(--tone-neutral-bg));
        color: var(--white);
        font-size: 0.71875rem;
        font-weight: 600;
        white-space: nowrap;
      }
      .aurum-period-cell:not([data-tom]) {
        color: var(--on-surface);
      }
      /* O destaque do período corrente fica na coluna (quem hospeda); o texto
         "ATUAL" segue na célula só para leitores de tela. */
      .aurum-period-cell__atual {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
      [data-tom='solicitado'] { --tom: var(--tone-solid-orange); }
      [data-tom='reservado'] { --tom: var(--tone-solid-blue); }
      [data-tom='autorizado'] { --tom: var(--tone-solid-purple); }
      [data-tom='faturado'] { --tom: var(--tone-solid-green); }
      [data-tom='indisponivel'] { --tom: var(--tone-solid-gray); }
    `,
  ],
})
export class AurumPeriodCellComponent {
  @Input() status = '';

  readonly tomDoStatus = tomDoStatusProgramacao;
  @Input() atual = false;
}
