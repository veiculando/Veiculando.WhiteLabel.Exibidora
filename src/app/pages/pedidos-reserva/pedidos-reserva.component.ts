import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pedidos-reserva',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Pedidos de Reserva</h1>
      <p>Gestão e aprovação/rejeição de pedidos de reserva.</p>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; color: #fff; }
  `]
})
export class PedidosReservaComponent {}
