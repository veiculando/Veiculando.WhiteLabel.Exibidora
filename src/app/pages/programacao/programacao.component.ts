import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-programacao',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Grade de Programação</h1>
      <p>Programação de peças por local e bi-semana.</p>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; color: #fff; }
  `]
})
export class ProgramacaoComponent {}
