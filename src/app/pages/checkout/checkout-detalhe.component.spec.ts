import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { CheckoutDetalheComponent } from './checkout-detalhe.component';
import { environment } from '../../../environments/environment';

/**
 * Check out — detalhe (VEI-RD-91, Figma `184:501`).
 *
 * `GET /api/wl/checking/{id:int}` (confirmado lendo `CheckingController.GetById`
 * real no workspace irmão do BFF, 2026-09-22). O "histórico de avaliação" é
 * o estado ATUAL de cada foto (`itens[].fotos[]`), não uma timeline — o
 * domínio sobrescreve o estado anterior, não guarda avaliações passadas.
 *
 * VEI-RD-91d (regra dura desta sprint): "Aprovar Checking"/"Recusar
 * Checking" não podem existir no DOM — nem como botão desabilitado.
 */
describe('CheckoutDetalheComponent', () => {
  let httpMock: HttpTestingController;
  const base = `${environment.bffUrl}/checking`;

  function configurar(id = '1') {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id }) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  function detalhePadrao() {
    return {
      id: 1,
      status: 'Iniciado',
      dataCadastro: '2026-07-01T10:00:00',
      dataAtualizacao: null,
      piCodigo: 'PI-1',
      campanha: 'Campanha X',
      anunciante: 'Anunciante Y',
      itens: [
        {
          idPedidoItem: 1,
          pecaCodigo: 'PC-1',
          localCodigo: 'L-1',
          localDescricao: 'Rua A, 100',
          cidade: 'São Paulo',
          periodo: 'Bissemana 16',
          status: 'Iniciado',
          fotos: [
            {
              id: 10,
              downloadUrl: '/api/wl/checking/item/1/fotos/10/arquivo',
              status: 'Recebido',
              nota: null,
              observacaoAvaliacao: null,
              observacaoPublicacao: null,
              geolocalizacao: { latitude: -23.5, longitude: -46.6 },
              distanciaPeca: 12.3,
              enviadaEm: '2026-07-02T10:00:00',
              avaliadaEm: null,
            },
          ],
        },
      ],
    };
  }

  it('nunca renderiza Aprovar Checking / Recusar Checking, nem desabilitados', () => {
    configurar();
    const fixture = TestBed.createComponent(CheckoutDetalheComponent);
    fixture.detectChanges();

    httpMock.expectOne(`${base}/1`).flush(detalhePadrao());

    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Aprovar Checking');
    expect(texto).not.toContain('Recusar Checking');
  });

  it('renderiza um card por foto, nao uma timeline de historicoAvaliacao', () => {
    configurar();
    const fixture = TestBed.createComponent(CheckoutDetalheComponent);
    fixture.detectChanges();

    httpMock.expectOne(`${base}/1`).flush(detalhePadrao());

    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.cd-foto-card');
    expect(cards.length).toBe(1);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Recebido');
    expect(texto).toContain('-23.5');
  });

  it('link de mapa e montado no cliente a partir de localDescricao/cidade', () => {
    configurar();
    const fixture = TestBed.createComponent(CheckoutDetalheComponent);
    fixture.detectChanges();

    httpMock.expectOne(`${base}/1`).flush(detalhePadrao());

    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.cd-mapa');
    expect(link?.getAttribute('href')).toBe(
      'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Rua A, 100, São Paulo')
    );
  });

  it('abrir foto baixa como blob pelo HttpClient (nao um <img src> direto, que voltaria 401)', () => {
    configurar();
    const fixture = TestBed.createComponent(CheckoutDetalheComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${base}/1`).flush(detalhePadrao());
    fixture.detectChanges();

    vi.spyOn(window, 'open').mockReturnValue(null);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    fixture.componentInstance.abrirFoto(detalhePadrao().itens[0].fotos[0]);

    const req = httpMock.expectOne('/api/wl/checking/item/1/fotos/10/arquivo');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x']));

    expect(window.open).toHaveBeenCalledWith('blob:local', '_blank');
  });

  it('falha ao carregar mostra mensagem, sem quebrar', () => {
    configurar();
    const fixture = TestBed.createComponent(CheckoutDetalheComponent);
    fixture.detectChanges();

    httpMock.expectOne(`${base}/1`).flush(null, { status: 404, statusText: 'Not Found' });

    expect(fixture.componentInstance.erro).toBeTruthy();
    expect(fixture.componentInstance.detalhe).toBeNull();
  });
});
