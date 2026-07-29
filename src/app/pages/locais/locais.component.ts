import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-locais',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Gestão de Locais & Peças</h1>
      <p>Módulo de cadastro e alteração de pontos de exibição.</p>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; color: #fff; }
  `]
})
export class LocaisComponent {}
