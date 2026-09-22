import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { CheckoutListagemComponent } from './checkout-listagem.component';
import { environment } from '../../../environments/environment';

/**
 * Check out — listagem (VEI-RD-91, Figma `184:2`).
 *
 * Sem controller no BFF ainda; estes testes fixam o contrato que o frontend
 * espera (`GET /api/wl/checkout`, filtro na query string, envelope PaginaWl).
 */
describe('CheckoutListagemComponent', () => {
  let httpMock: HttpTestingController;
  const base = `${environment.bffUrl}/checkout`;

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
          codigo: 'PI-1',
          campanha: 'Campanha X',
          anunciante: 'Anunciante Y',
          cidade: 'São Paulo',
          itensPi: 10,
          itensChecking: 4,
          itensAprovados: 3,
          itensRecebidos: 2,
          periodoVeiculacaoInicio: '2026-07-01',
          periodoVeiculacaoFim: '2026-07-31',
          status: 'Checking',
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPaginas: 1,
    });

    return componente;
  }

  it('lista o check out em GET {bffUrl}/checkout', () => {
    const componente = criar();
    expect(componente.itens.length).toBe(1);
    expect(componente.itens[0].codigo).toBe('PI-1');
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

  it('formata o periodo de veiculacao como DD/MM–DD/MM', () => {
    const componente = criar();
    expect(componente.periodoTexto(componente.itens[0])).toBe('01/07–31/07');
  });

  it('colunas abreviadas tem title/aria-label com o nome completo', () => {
    const fixture = TestBed.createComponent(CheckoutListagemComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === `${environment.bffUrl}/lookups/periodos`).flush([]);
    httpMock.expectOne((r) => r.url === `${environment.bffUrl}/lookups/cidades`).flush([]);
    httpMock.expectOne((r) => r.url === base).flush({
      itens: [{
        id: 1, codigo: 'PI-1', campanha: 'C', anunciante: 'A', cidade: 'SP',
        itensPi: 1, itensChecking: 1, itensAprovados: 1, itensRecebidos: 1,
        periodoVeiculacaoInicio: null, periodoVeiculacaoFim: null, status: 'Novo',
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

  it('trocar filtro volta para a primeira pagina', () => {
    const componente = criar();

    componente.carregar(2);
    httpMock.expectOne((r) => r.url === base && r.params.get('page') === '2').flush({ itens: [], page: 2, pageSize: 25, total: 30, totalPaginas: 2 });
    expect(componente.page).toBe(2);

    componente.mudarFiltro('status', 'Aprovado');
    const req = httpMock.expectOne((r) => r.url === base && r.params.get('page') === '1');
    expect(req.request.params.get('status')).toBe('Aprovado');
    req.flush({ itens: [], page: 1, pageSize: 25, total: 0, totalPaginas: 0 });
  });
});
