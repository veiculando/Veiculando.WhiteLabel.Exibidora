import { Component, ChangeDetectionStrategy, inject } from '@angular/core';

import { BrandingService } from '../core/branding/branding.service';

@Component({
    selector: 'app-footer',
    imports: [],
    template: `
    <footer class="footer-container">
      <span>&copy; {{ currentYear }} {{ brand()?.footerText || brand()?.nomeExibicao }}. Todos os direitos reservados.</span>
    </footer>
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    .footer-container { text-align: center; padding: 14px; font-size: 0.76rem; color: var(--on-surface); border-top: 1px solid var(--divider); background: var(--white); margin-top: auto; }
  `]
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();
  readonly brand = inject(BrandingService).branding;
}
