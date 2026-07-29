import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="footer-container">
      <span>&copy; {{ currentYear }} {{ footerText }}. Todos os direitos reservados.</span>
    </footer>
  `,
  styles: [`
    .footer-container { text-align: center; padding: 12px; font-size: 0.8rem; color: #6c757d; border-top: 1px solid #e1e3ea; background: #fff; margin-top: auto; }
  `]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  footerText = environment.branding.footerText;
}
