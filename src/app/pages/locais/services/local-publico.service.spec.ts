import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { LocalPublicoService } from './local-publico.service';
import { environment } from '../../../../environments/environment';
import { emptyLocalPublicoPayload } from '../models/local-publico.model';

describe('LocalPublicoService', () => {
  let service: LocalPublicoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocalPublicoService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LocalPublicoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lê a demografia em GET {bffUrl}/locais/{id}/publico — endpoint separado do Local', () => {
    service.getPublico(5).subscribe();
    const req = httpMock.expectOne(`${environment.bffUrl}/locais/5/publico`);
    expect(req.request.method).toBe('GET');
    req.flush(emptyLocalPublicoPayload());
  });

  it('grava a demografia em PUT {bffUrl}/locais/{id}/publico (BFF delega a LocalPublicoCadastroCommand no Core)', () => {
    const payload = emptyLocalPublicoPayload();
    payload.audiencia = 1000;

    service.savePublico(5, payload).subscribe();

    const req = httpMock.expectOne(`${environment.bffUrl}/locais/5/publico`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    // Nunca toca endereço/geolocalização/código interno (BDD "Salvar demografia preserva o local")
    expect(req.request.body.logradouro).toBeUndefined();
    expect(req.request.body.latitude).toBeUndefined();
    expect(req.request.body.codigoInterno).toBeUndefined();
    req.flush(payload);
  });

  it('nunca envia arrays nulos — payload vazio tem todos os arrays como []', () => {
    const payload = emptyLocalPublicoPayload();
    expect(payload.faixaEtaria).toEqual([]);
    expect(payload.faixaRenda).toEqual([]);
    expect(payload.perfisPsicograficos).toEqual([]);
    expect(payload.segmentos).toEqual([]);
    expect(payload.poiCategorias).toEqual([]);
  });
});
