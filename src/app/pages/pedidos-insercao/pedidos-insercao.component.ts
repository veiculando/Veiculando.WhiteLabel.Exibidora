import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pedidos-insercao',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Pedidos de Inserção (PI)</h1>
      <p>Listagem e visualização de Pedidos de Inserção autorizados.</p>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; color: #fff; }
  `]
})
export class PedidosInsercaoComponent {}
