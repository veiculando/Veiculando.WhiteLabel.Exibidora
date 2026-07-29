import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <h2>Login Operador WL</h2>
      <p>Página de autenticação da Exibidora.</p>
    </div>
  `,
  styles: [`
    .login-container { max-width: 400px; margin: 80px auto; padding: 24px; background: #1e1e2d; color: #fff; border-radius: 8px; }
  `]
})
export class LoginComponent {}
