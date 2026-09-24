import { Component, ChangeDetectionStrategy, inject } from '@angular/core';

import { BrandingService } from '../core/branding/branding.service';

/** Rodapé — nó `222:458` do Figma Aurum: créditos à esquerda, direitos à direita, texto vinho sobre papel. */
@Component({
    selector: 'app-footer',
    imports: [],
    template: `
    <footer class="footer-container">
      <span>&copy; {{ currentYear }} {{ brand()?.nomeExibicao }} · Veiculando WhiteLabel</span>
      <span class="footer__direitos"><span aria-hidden="true">•</span> Todos os direitos reservados</span>
    </footer>
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    .footer-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      padding: 20px 40px;
      margin-top: auto;
      background: var(--paper-bg);
      filter: drop-shadow(0 -4px 2px rgba(0, 0, 0, 0.05));
      color: var(--primary-color);
      font-size: 0.75rem;
      line-height: 18px;
    }
    .footer__direitos {
      display: inline-flex;
      gap: 12px;
      font-size: 0.71875rem;
    }
  `]
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();
  readonly brand = inject(BrandingService).branding;
}
