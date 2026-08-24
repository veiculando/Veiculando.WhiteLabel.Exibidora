import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { LocalService } from './local.service';
import { environment } from '../../../../environments/environment';
import { StatusExibicao } from '../models/status-exibicao.enum';
import { LocalDadosPayload } from '../models/local.model';

describe('LocalService', () => {
  let service: LocalService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocalService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LocalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lista locais em GET {bffUrl}/locais sem enviar afiliadaId (tenant é resolvido pelo Host)', () => {
    service.listLocais({ busca: 'praça' }).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.bffUrl}/locais` && r.params.get('busca') === 'praça'
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('afiliadaId')).toBeFalse();
    expect(req.request.params.has('idAfiliada')).toBeFalse();
    req.flush({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
  });

  it('busca detalhe em GET {bffUrl}/locais/{id}', () => {
    service.getLocal(42).subscribe();
    const req = httpMock.expectOne(`${environment.bffUrl}/locais/42`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 42 });
  });

  it('cria local em POST {bffUrl}/locais sem nenhum campo de tenant/origem no payload', () => {
    const payload: LocalDadosPayload = {
      idCidade: 1,
      codigoInterno: 'INT-1',
      descricao: null,
      cep: '01000-000',
      logradouro: 'Rua A',
      numero: '100',
      bairro: 'Centro',
      complemento: null,
      referencia: null,
      latitude: -23.5,
      longitude: -46.6,
      palavrasChave: null,
    };

    service.createLocal(payload).subscribe();

    const req = httpMock.expectOne(`${environment.bffUrl}/locais`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.body.afiliadaId).toBeUndefined();
    expect(req.request.body.fonteUsuarioId).toBeUndefined();
    req.flush({ id: 1, statusExibicao: StatusExibicao.AprovacaoPendente });
  });

  it('edita local em PUT {bffUrl}/locais/{id} enviando somente campos de Dados do Local (nunca demografia)', () => {
    const payload: LocalDadosPayload = {
      idCidade: 1,
      codigoInterno: 'INT-1',
      descricao: 'desc',
      cep: '01000-000',
      logradouro: 'Rua A',
      numero: '100',
      bairro: 'Centro',
      complemento: null,
      referencia: null,
      latitude: -23.5,
      longitude: -46.6,
      palavrasChave: null,
    };

    service.updateLocal(7, payload).subscribe();

    const req = httpMock.expectOne(`${environment.bffUrl}/locais/7`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    expect(Object.keys(req.request.body)).not.toContain('genero');
    expect(Object.keys(req.request.body)).not.toContain('faixasEtarias');
    req.flush({ id: 7 });
  });
});
