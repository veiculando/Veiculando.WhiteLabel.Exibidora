import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SecureStorage } from './core/auth/secure-storage';
import { environment } from '../environments/environment';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Veiculando.WhiteLabel.Exibidora';

  // Smoke test for ag-grid
  rowData = [
    { campanha: 'Campanha de Inverno', cliente: 'Coca-Cola', status: 'Ativo' },
    { campanha: 'Black Friday 2026', cliente: 'Samsung', status: 'Pendente' }
  ];

  colDefs: ColDef[] = [
    { field: 'campanha', flex: 1 },
    { field: 'cliente', flex: 1 },
    { field: 'status', flex: 1 }
  ];

  testToken() {
    console.log('Testing Secure Storage (Exibidora)...');
    SecureStorage.setToken(environment.tokenKey, 'fake-jwt-token-exibidora-456');
    const retrieved = SecureStorage.getToken(environment.tokenKey);
    console.log('Retrieved Token:', retrieved);
  }
}
