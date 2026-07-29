import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Operadores da Exibidora</h1>
      <p>Gestão de operadores e atribuição de permissões.</p>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; color: #fff; }
  `]
})
export class UsuariosComponent {}
