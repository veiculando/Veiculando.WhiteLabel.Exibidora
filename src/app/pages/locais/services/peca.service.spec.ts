import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PecaService } from './peca.service';
import { environment } from '../../../../environments/environment';
import { PecaPayload } from '../models/peca.model';

describe('PecaService', () => {
  let service: PecaService;
  let httpMock: HttpTestingController;

  const payload: PecaPayload = {
    idLocal: 9,
    idTipoSuporte: 1,
    codigoInterno: 'PC-1',
    periodicidadePadrao: 1,
    valorPadrao: 100,
    idFormato: 2,
    formatoLargura: 3,
    formatoAltura: 2,
    formatoJuncao: 0,
    especificacaoLargura: null,
    especificacaoAltura: null,
    especificacaoMaterial: null,
    especificacaoTexto: null,
    idsSubstratoTipo: [],
    iluminacao: false,
    semaforo: false,
    anguloDeVisao: 90,
    viaTipo: 0,
    viaFaixas: 2,
    viaVelocidade: 60,
    viaPedestre: 0,
    roteiroComercial: false,
    alvara: false,
    streetView: null,
    descricao: null,
    restricao: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PecaService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PecaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lista peças de um local em GET {bffUrl}/locais/{idLocal}/pecas', () => {
    service.listPecasByLocal(9).subscribe();
    const req = httpMock.expectOne(`${environment.bffUrl}/locais/9/pecas`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('cria peça em POST {bffUrl}/pecas com idLocal vindo do parâmetro, não do formulário', () => {
    service.createPeca(payload).subscribe();
    const req = httpMock.expectOne(`${environment.bffUrl}/pecas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.idLocal).toBe(9);
    req.flush({ id: 1, ...payload });
  });

  it('edita peça em PUT {bffUrl}/pecas/{id} sem permitir mover para outro local (idLocal vem fixo da rota)', () => {
    service.updatePeca(3, payload).subscribe();
    const req = httpMock.expectOne(`${environment.bffUrl}/pecas/3`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.idLocal).toBe(9);
    req.flush({ id: 3, ...payload });
  });

  it('busca detalhe da peça em GET {bffUrl}/pecas/{id}', () => {
    service.getPeca(3).subscribe();
    const req = httpMock.expectOne(`${environment.bffUrl}/pecas/3`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 3, ...payload });
  });
});
