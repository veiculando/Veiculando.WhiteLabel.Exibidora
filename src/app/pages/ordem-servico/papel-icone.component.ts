import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-papel-icone',
  template: `
    @if (papel === 'colador') {
      <span class="pi" title="Colagem realizada" aria-label="Colagem realizada">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <rect x="8" y="3" width="8" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.6" />
          <path d="M10 10v8h4v-8" fill="none" stroke="currentColor" stroke-width="1.6" />
        </svg>
      </span>
    } @else {
      <span class="pi" title="Foto enviada" aria-label="Foto enviada">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M4 8h4l2-2h4l2 2h4v11H4z" fill="none" stroke="currentColor" stroke-width="1.6" />
          <circle cx="12" cy="13" r="3" fill="none" stroke="currentColor" stroke-width="1.6" />
        </svg>
      </span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .pi {
        display: inline-flex;
        color: var(--primary-dark);
        cursor: help;
      }
    `,
  ],
})
export class PapelIconeComponent {
  @Input({ required: true }) papel!: 'colador' | 'fiscal';
}
