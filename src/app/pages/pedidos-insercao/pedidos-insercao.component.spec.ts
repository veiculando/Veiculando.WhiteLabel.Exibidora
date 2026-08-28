import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PedidosInsercaoComponent } from './pedidos-insercao.component';
import { PedidosInsercaoService } from '../../core/services/pedidos.service';
import { environment } from '../../../environments/environment';

/**
 * Card `c2a44cbc`, cenarios 4 e 5 no lado da UI.
 *
 * A tela abria `<a [href]="pedido.pdfUrl">`, com `pdfUrl` vindo do BFF montado
 * a partir do host do FileServer. Estes testes fixam o contrato novo: o PDF sai
 * do BFF, em mesma origem, e nenhum host externo aparece no caminho.
 */
describe('PedidosInsercaoComponent', () => {
  let httpMock: HttpTestingController;
  const base = `${environment.bffUrl}/pedidos-insercao`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PedidosInsercaoService, provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function criar(): PedidosInsercaoComponent {
    const fixture = TestBed.createComponent(PedidosInsercaoComponent);
    const componente = fixture.componentInstance;
    componente.ngOnInit();

    httpMock.expectOne((r) => r.url === base).flush({
      itens: [
        {
          id: 1,
          codigo: 'PI-1',
          dataCadastro: '2026-08-01',
          status: 'Ativo',
          agencia: 'Agencia X',
          anunciante: 'Cliente Y',
          valorLiquidoVeiculacao: 100,
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPaginas: 1,
    });

    return componente;
  }

  it('lista PIs paginadas em GET {bffUrl}/pedidos-insercao', () => {
    const componente = criar();

    expect(componente.pedidos.length).toBe(1);
    expect(componente.pedidos[0].codigo).toBe('PI-1');
    expect(componente.total).toBe(1);
  });

  it('respeita o pageSize devolvido pelo servidor, nao o pedido', () => {
    const componente = TestBed.createComponent(PedidosInsercaoComponent).componentInstance;
    componente.pageSize = 5000;
    componente.ngOnInit();

    httpMock
      .expectOne((r) => r.url === base)
      .flush({ itens: [], page: 1, pageSize: 100, total: 0, totalPaginas: 0 });

    expect(componente.pageSize).toBe(100);
  });

  it('navegar de pagina pede a pagina nova', () => {
    const componente = criar();

    componente.carregar(2);
    httpMock
      .expectOne((r) => r.url === base && r.params.get('page') === '2')
      .flush({ itens: [], page: 2, pageSize: 25, total: 30, totalPaginas: 2 });

    expect(componente.page).toBe(2);
  });

  it('baixa o PDF pelo BFF em mesma origem, como blob, sem tocar o FileServer', () => {
    const componente = criar();
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    componente.abrirPdf('PI-1');

    const req = httpMock.expectOne(`${base}/PI-1/pdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');

    // A URL e relativa ao proprio painel: nenhum host externo no caminho.
    expect(req.request.url.startsWith('/api/wl/')).toBe(true);
    expect(req.request.url).not.toContain('fileserver');

    req.flush(new Blob(['%PDF-'], { type: 'application/pdf' }));

    expect(abrir).toHaveBeenCalledWith('blob:local', '_blank');
    expect(componente.baixando).toBeNull();
  });

  it('falha ao abrir o PDF vira mensagem na tela e libera o botao', () => {
    const componente = criar();

    componente.abrirPdf('PI-1');

    httpMock
      .expectOne(`${base}/PI-1/pdf`)
      .flush(null, { status: 502, statusText: 'Bad Gateway' });

    expect(componente.baixando).toBeNull();
    expect(componente.erro).toBeTruthy();
    // A mensagem e do painel, nao o corpo cru do erro remoto.
    expect(componente.erro).not.toContain('fileserver');
  });

  it('ignora clique repetido enquanto um download esta em curso', () => {
    const componente = criar();

    componente.abrirPdf('PI-1');
    componente.abrirPdf('PI-1');

    // Uma unica requisicao: a segunda chamada saiu pelo guard de `baixando`.
    httpMock.expectOne(`${base}/PI-1/pdf`).flush(new Blob(['%PDF-']));
  });
});
