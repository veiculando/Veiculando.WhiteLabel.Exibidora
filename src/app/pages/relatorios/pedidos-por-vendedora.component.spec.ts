import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PermissionService } from '../../core/auth/permission.service';
import { environment } from '../../../environments/environment';
import { PedidosPorVendedoraComponent } from './pedidos-por-vendedora.component';

describe('PedidosPorVendedoraComponent (VEI-RD-157f)', () => {
  const url = `${environment.bffUrl}/relatorios/pedidos-por-vendedora`;
  const resposta = {
    de: '2026-11-01', ate: '2026-11-05', totalPedidos: 1, valorBrutoTotal: 1500,
    porVendedora: [{ vendedorId: 7, vendedora: 'ana@aurum.com', pedidos: 1, valorBruto: 1500 }],
    pedidos: [{ vendedorId: 7, vendedora: 'ana@aurum.com', pedido: 'P1', dataPedido: '2026-11-03', cliente: 'Sol', cnpjCliente: '11222333000181',
      campanha: 'Natal', periodo: 'Bi 23', valorBruto: 1500, valorLiquidoAnunciante: 1500, status: 'Aberto' }],
  };

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('filtra por período e vendedora e só mostra exportar com RelatorioExportar', () => {
    TestBed.configureTestingModule({
      imports: [PedidosPorVendedoraComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: PermissionService, useValue: { has: () => false } }],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PedidosPorVendedoraComponent);
    fixture.detectChanges();
    http.expectOne(r => r.url === url && !!r.params.get('de') && !r.params.has('vendedorId')).flush(resposta);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('11.222.333/0001-81');
    expect(texto).not.toContain('Exportar');
    expect(fixture.componentInstance.opcoes.map(o => o.vendedorId)).toEqual([7]);

    fixture.componentInstance.vendedorId = 7;
    fixture.componentInstance.carregar();
    http.expectOne(r => r.url === url && r.params.get('vendedorId') === '7').flush({ ...resposta, totalPedidos: 0, porVendedora: [], pedidos: [] });
    expect(fixture.componentInstance.opcoes.length).toBe(1);
  });
});
