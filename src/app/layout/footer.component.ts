import { Component, ChangeDetectionStrategy } from '@angular/core';

import { environment } from '../../environments/environment';

@Component({
    selector: 'app-footer',
    imports: [],
    template: `
    <footer class="footer-container">
      <span>&copy; {{ currentYear }} {{ footerText }}. Todos os direitos reservados.</span>
    </footer>
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    .footer-container { text-align: center; padding: 12px; font-size: 0.8rem; color: #6c757d; border-top: 1px solid #e1e3ea; background: #fff; margin-top: auto; }
  `]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  footerText = environment.branding.footerText;
}
