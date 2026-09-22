import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { CheckoutListagemComponent } from './checkout-listagem.component';
import { environment } from '../../../environments/environment';

/**
 * Check out — listagem (VEI-RD-91, Figma `184:2`).
 *
 * A rota do BFF é `api/wl/checking`, não `api/wl/checkout` — confirmado
 * lendo `CheckingController.GetAll` real no workspace irmão do BFF em
 * 2026-09-22. Estes testes fixam esse contrato.
 */
describe('CheckoutListagemComponent', () => {
  let httpMock: HttpTestingController;
  const base = `${environment.bffUrl}/checking`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function criar(): CheckoutListagemComponent {
    const componente = TestBed.createComponent(CheckoutListagemComponent).componentInstance;
    componente.ngOnInit();

    httpMock.expectOne((r) => r.url === `${environment.bffUrl}/lookups/periodos`).flush([]);
    httpMock.expectOne((r) => r.url === `${environment.bffUrl}/lookups/cidades`).flush([]);
    httpMock.expectOne((r) => r.url === base).flush({
      itens: [
        {
          id: 1,
          status: 'Iniciado',
          dataCadastro: '2026-07-01T10:00:00',
          dataAtualizacao: null,
          piCodigo: 'PI-1',
          campanha: 'Campanha X',
          anunciante: 'Anunciante Y',
          itensPi: 10,
          itensChecados: 4,
          itensAprovados: 3,
          itensRecebidos: 2,
          cidades: ['São Paulo'],
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPaginas: 1,
    });

    return componente;
  }

  it('lista o check out em GET {bffUrl}/checking', () => {
    const componente = criar();
    expect(componente.itens.length).toBe(1);
    expect(componente.itens[0].piCodigo).toBe('PI-1');
  });

  it('nao tem coluna Afiliada', () => {
    const fixture = TestBed.createComponent(CheckoutListagemComponent);
    // Um unico detectChanges() dispara o ngOnInit (nunca chamar ngOnInit()
    // manualmente e TAMBEM detectChanges(): o Angular invocaria ngOnInit de
    // novo no primeiro detectChanges, disparando a requisicao em dobro).
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === `${environment.bffUrl}/lookups/periodos`).flush([]);
    httpMock.expectOne((r) => r.url === `${environment.bffUrl}/lookups/cidades`).flush([]);
    httpMock.expectOne((r) => r.url === base).flush({ itens: [], page: 1, pageSize: 25, total: 0, totalPaginas: 0 });

    // O flush acima ja atualizou o estado (sincrono); este segundo
    // detectChanges so re-renderiza — nao muta @Input nenhum, entao nao cai
    // no problema do scheduler coalescido do Angular 22 com @Input.
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Afiliada');
  });

  it('as 4 colunas numericas usam itensPi/itensChecados/itensAprovados/itensRecebidos (nao itensCount)', () => {
    const componente = criar();
    expect(componente.itens[0].itensPi).toBe(10);
    expect(componente.itens[0].itensChecados).toBe(4);
    expect(componente.itens[0].itensAprovados).toBe(3);
    expect(componente.itens[0].itensRecebidos).toBe(2);
  });

  it('colunas abreviadas tem title/aria-label com o nome completo', () => {
    const fixture = TestBed.createComponent(CheckoutListagemComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === `${environment.bffUrl}/lookups/periodos`).flush([]);
    httpMock.expectOne((r) => r.url === `${environment.bffUrl}/lookups/cidades`).flush([]);
    httpMock.expectOne((r) => r.url === base).flush({
      itens: [{
        id: 1, status: 'Iniciado', dataCadastro: '2026-07-01T10:00:00', dataAtualizacao: null,
        piCodigo: 'PI-1', campanha: 'C', anunciante: 'A',
        itensPi: 1, itensChecados: 1, itensAprovados: 1, itensRecebidos: 1, cidades: ['SP'],
      }],
      page: 1, pageSize: 25, total: 1, totalPaginas: 1,
    });

    fixture.detectChanges();
    const cabecalhos = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('th'));
    const check = cabecalhos.find((th) => th.textContent?.trim() === 'Check.');
    const aprov = cabecalhos.find((th) => th.textContent?.trim() === 'Aprov.');
    const receb = cabecalhos.find((th) => th.textContent?.trim() === 'Receb.');
    expect(check?.getAttribute('title')).toBeTruthy();
    expect(aprov?.getAttribute('title')).toBeTruthy();
    expect(receb?.getAttribute('title')).toBeTruthy();
    expect(check?.getAttribute('aria-label')).toBeTruthy();
  });

  it('acao Ver detalhe aponta para /checkout/:id (numerico)', () => {
    const fixture = TestBed.createComponent(CheckoutListagemComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === `${environment.bffUrl}/lookups/periodos`).flush([]);
    httpMock.expectOne((r) => r.url === `${environment.bffUrl}/lookups/cidades`).flush([]);
    httpMock.expectOne((r) => r.url === base).flush({
      itens: [{
        id: 42, status: 'Iniciado', dataCadastro: '2026-07-01T10:00:00', dataAtualizacao: null,
        piCodigo: 'PI-1', campanha: 'C', anunciante: 'A',
        itensPi: 1, itensChecados: 1, itensAprovados: 1, itensRecebidos: 1, cidades: [],
      }],
      page: 1, pageSize: 25, total: 1, totalPaginas: 1,
    });
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a.co-link');
    expect(link?.getAttribute('href')).toBe('/checkout/42');
  });

  it('busca unica manda um so parametro "busca", nao campanha/anunciante separados', () => {
    vi.useFakeTimers();
    try {
      const componente = criar();

      componente.mudarBusca('Acme');
      vi.advanceTimersByTime(400);

      const req = httpMock.expectOne((r) => r.url === base && r.params.get('page') === '1');
      expect(req.request.params.get('busca')).toBe('Acme');
      expect(req.request.params.has('campanha')).toBe(false);
      expect(req.request.params.has('anunciante')).toBe(false);
      req.flush({ itens: [], page: 1, pageSize: 25, total: 0, totalPaginas: 0 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('trocar filtro volta para a primeira pagina', () => {
    const componente = criar();

    componente.carregar(2);
    httpMock.expectOne((r) => r.url === base && r.params.get('page') === '2').flush({ itens: [], page: 2, pageSize: 25, total: 30, totalPaginas: 2 });
    expect(componente.page).toBe(2);

    componente.mudarFiltro('status', 'Aprovado');
    const req = httpMock.expectOne((r) => r.url === base && r.params.get('page') === '1');
    expect(req.request.params.get('status')).toBe('Aprovado');
    expect(req.request.params.has('campanha')).toBe(false);
    expect(req.request.params.has('anunciante')).toBe(false);
    req.flush({ itens: [], page: 1, pageSize: 25, total: 0, totalPaginas: 0 });
  });
});
