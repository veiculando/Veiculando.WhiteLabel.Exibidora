import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-acesso-negado',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="acesso-negado-container">
      <h2>Acesso Negado (403)</h2>
      <p>Você não possui permissão para acessar esta funcionalidade.</p>
    </div>
  `,
  styles: [`
    .acesso-negado-container { padding: 32px; color: #f64e60; text-align: center; }
  `]
})
export class AcessoNegadoComponent {}
