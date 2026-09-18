import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type AurumStatusPillTom = 'neutro' | 'sucesso' | 'aviso' | 'perigo' | 'primario';

/**
 * Badge de status — cobre StatusPill, Pill e Status Tag do Figma, que são o
 * mesmo componente reaproveitado sob nomes de frame diferentes.
 *
 * Invariante do PRD §7: o rótulo textual é sempre renderizado, nunca só a
 * cor — não existe um `@Input` para omitir o texto.
 */
@Component({
  selector: 'aurum-status-pill',
  imports: [],
  template: `
    <span class="aurum-status-pill" [class]="'aurum-status-pill--' + tom">{{ rotulo }}</span>
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
        white-space: nowrap;
      }
      .aurum-status-pill--neutro {
        background: var(--surface-muted);
        color: var(--on-surface);
      }
      .aurum-status-pill--sucesso {
        background: var(--success-bg);
        color: var(--success);
        border: 1px solid var(--success-border);
      }
      .aurum-status-pill--aviso {
        background: var(--warning-bg);
        color: var(--warning);
        border: 1px solid var(--warning-border);
      }
      .aurum-status-pill--perigo {
        background: var(--danger-bg);
        color: var(--danger);
        border: 1px solid var(--danger-border);
      }
      .aurum-status-pill--primario {
        background: color-mix(in srgb, var(--primary-color) 12%, var(--white));
        color: var(--primary-color);
        border: 1px solid color-mix(in srgb, var(--primary-color) 30%, var(--white));
      }
    `,
  ],
})
export class AurumStatusPillComponent {
  @Input() rotulo = '';
  @Input() tom: AurumStatusPillTom = 'neutro';
}
