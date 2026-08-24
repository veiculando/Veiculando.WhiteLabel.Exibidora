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
    service.listLocais().subscribe();

    const req = httpMock.expectOne(`${environment.bffUrl}/locais`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('afiliadaId')).toBe(false);
    expect(req.request.params.has('idAfiliada')).toBe(false);
    req.flush([]);
  });

  it('busca detalhe em GET {bffUrl}/locais/{id}', () => {
    service.getLocal(42).subscribe();
    const req = httpMock.expectOne(`${environment.bffUrl}/locais/42`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 42 });
  });

  it('cria local em POST {bffUrl}/locais traduzindo o form flat para o comando aninhado do Core', () => {
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
    expect(req.request.body.idCidade).toBe(1);
    expect(req.request.body.endereco).toEqual({
      bairro: 'Centro',
      logradouro: 'Rua A',
      numero: '100',
      complemento: null,
      referencia: null,
      cep: { numero: '01000-000' },
    });
    expect(req.request.body.geolocalizacao).toEqual({ latitude: -23.5, longitude: -46.6 });
    // Nunca campos de tenant/origem — o Core os preenche a partir do JWT (ADR-WL-003/008).
    expect(req.request.body.idAfiliada).toBeUndefined();
    expect(req.request.body.fonteUsuarioId).toBeUndefined();
    req.flush({ success: true, data: { local: { id: 1, statusExibicao: StatusExibicao.AprovacaoPendente } } });
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
    expect(Object.keys(req.request.body)).not.toContain('genero');
    expect(Object.keys(req.request.body)).not.toContain('faixaEtaria');
    req.flush({ success: true, data: { local: { id: 7 } } });
  });

  it('exclui local em DELETE {bffUrl}/locais/{id}', () => {
    service.deleteLocal(7).subscribe();
    const req = httpMock.expectOne(`${environment.bffUrl}/locais/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
