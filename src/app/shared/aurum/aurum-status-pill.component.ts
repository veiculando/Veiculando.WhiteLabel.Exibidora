import { booleanAttribute, ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type AurumStatusPillTom =
  | 'neutro'
  | 'sucesso'
  | 'aviso'
  | 'perigo'
  | 'info'
  | 'primario'
  | 'ouro'
  | 'solido-azul'
  | 'solido-cinza'
  | 'solido-laranja'
  | 'solido-verde'
  | 'solido-roxo';

/**
 * Badge de status — cobre StatusPill, Pill e Status Tag do Figma, que são o
 * mesmo componente reaproveitado sob nomes de frame diferentes.
 *
 * Tons suaves (fundo translúcido) para status de entidade; `solido-*` para a
 * grade de Programação e as OS, onde o Figma usa pill cheia com texto branco;
 * `ouro` para etiquetas de segmento/suporte ("DOOH - LED").
 *
 * Invariante do PRD §7: o rótulo textual é sempre renderizado, nunca só a
 * cor — não existe um `@Input` para omitir o texto.
 */
@Component({
  selector: 'aurum-status-pill',
  imports: [],
  template: `
    <span [class]="'aurum-status-pill aurum-status-pill--' + tom + (compacto ? ' aurum-status-pill--compacto' : '')">{{ rotulo }}</span>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .aurum-status-pill {
        display: inline-flex;
        align-items: center;
        border-radius: var(--radius-pill);
        padding: 4px 12px;
        font-size: 0.75rem;
        font-weight: 600;
        line-height: 18px;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }
      .aurum-status-pill--compacto {
        padding: 3px 10px;
        font-size: 0.6875rem;
        font-weight: 700;
        line-height: normal;
        letter-spacing: 0;
      }
      .aurum-status-pill--neutro {
        background: var(--tone-neutral-bg);
        color: var(--tone-neutral);
      }
      .aurum-status-pill--sucesso {
        background: var(--tone-success-bg);
        color: var(--tone-success);
      }
      .aurum-status-pill--aviso {
        background: var(--tone-warning-bg);
        color: var(--tone-warning);
      }
      .aurum-status-pill--perigo {
        background: var(--wine-tint);
        color: var(--primary-color);
      }
      .aurum-status-pill--info {
        background: var(--tone-info-bg);
        color: var(--tone-info);
      }
      .aurum-status-pill--primario {
        background: var(--wine-tint);
        color: var(--primary-color);
      }
      .aurum-status-pill--ouro {
        background: var(--gold-tint);
        color: var(--primary-dark);
      }
      .aurum-status-pill--solido-azul,
      .aurum-status-pill--solido-cinza,
      .aurum-status-pill--solido-laranja,
      .aurum-status-pill--solido-verde,
      .aurum-status-pill--solido-roxo {
        color: var(--white);
        padding: 5px 12px;
        font-size: 0.71875rem;
        line-height: normal;
        letter-spacing: 0;
      }
      .aurum-status-pill--solido-azul { background: var(--tone-solid-blue); }
      .aurum-status-pill--solido-cinza { background: var(--tone-solid-gray); }
      .aurum-status-pill--solido-laranja { background: var(--tone-solid-orange); }
      .aurum-status-pill--solido-verde { background: var(--tone-solid-green); }
      .aurum-status-pill--solido-roxo { background: var(--tone-solid-purple); }
    `,
  ],
})
export class AurumStatusPillComponent {
  @Input() rotulo = '';
  @Input() tom: AurumStatusPillTom = 'neutro';
  /** Status Tag de linha de tabela/cartão (11px bold, 3×10) — Locais, Agências. */
  @Input({ transform: booleanAttribute }) compacto = false;
}
