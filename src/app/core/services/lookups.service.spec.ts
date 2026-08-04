import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { LookupsService } from './lookups.service';

describe('LookupsService', () => {
  let service: LookupsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), LookupsService],
    });
    service = TestBed.inject(LookupsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('cacheia o resultado: duas chamadas, uma requisicao', () => {
    service.cidades().subscribe();
    service.cidades().subscribe();

    const reqs = http.match(`${environment.bffUrl}/lookups/cidades`);
    expect(reqs.length).toBe(1);
    reqs[0].flush([{ id: 1, nome: 'São Paulo', sigla: 'SP' }]);
  });

  /**
   * `shareReplay(1)` reemite tambem o ERRO para todo assinante futuro. Sem
   * descartar a entrada do cache, uma falha de rede na primeira chamada ficava
   * cacheada pelo resto da sessao — e o formulario de cadastro de local engole o
   * erro (`error: () => this.cidades = []`), entao o dropdown de cidades ficava
   * permanentemente vazio, sem retry, ate recarregar a pagina.
   */
  it('NAO cacheia a falha: apos erro, a proxima chamada refaz a requisicao', () => {
    let primeiroErro: unknown = null;
    service.cidades().subscribe({ error: (e) => (primeiroErro = e) });

    http.expectOne(`${environment.bffUrl}/lookups/cidades`)
      .flush('falhou', { status: 500, statusText: 'Server Error' });

    expect(primeiroErro).withContext('o erro precisa chegar ao assinante').toBeTruthy();

    // Segunda tentativa: tem de sair requisicao nova.
    let cidades: unknown[] = [];
    service.cidades().subscribe((c) => (cidades = c));

    const segunda = http.expectOne(`${environment.bffUrl}/lookups/cidades`);
    segunda.flush([{ id: 1, nome: 'São Paulo', sigla: 'SP' }]);

    expect(cidades.length).toBe(1);
  });

  it('cada lookup tem cache proprio', () => {
    service.cidades().subscribe();
    service.periodos().subscribe();

    http.expectOne(`${environment.bffUrl}/lookups/cidades`).flush([]);
    http.expectOne(`${environment.bffUrl}/lookups/periodos`).flush([]);
  });
});
