import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-checking',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Checking de Veiculação</h1>
      <p>Upload de fotos de comprovação de veiculação.</p>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; color: #fff; }
  `]
})
export class CheckingComponent {}
