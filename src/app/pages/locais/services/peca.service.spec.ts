import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PecaService } from './peca.service';
import { environment } from '../../../../environments/environment';
import { PecaApiDetalhe, PecaPayload } from '../models/peca.model';
import { StatusExibicao } from '../models/status-exibicao.enum';

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

  const apiDetalhe: PecaApiDetalhe = {
    id: 3,
    codigo: 'PC-1',
    codigoInterno: 'PC-1',
    idLocal: 9,
    localCodigo: 'LOC-9',
    idTipoSuporte: 1,
    tipoSuporte: 'Outdoor',
    idFormato: 2,
    formatoDimensao: '3 x 2',
    formato: { largura: 3, altura: 2, juncao: 0 },
    especificacaoProducao: { largura: 3, altura: 2, material: 1, especificacao: 'texto' },
    periodicidadePadrao: 1,
    valorPadrao: 100,
    iluminacao: false,
    semaforo: false,
    anguloDeVisao: 90,
    via: { viaTipo: 0, faixas: 2, velociade: 60, pedestre: 0 },
    roteiroComercial: false,
    alvara: false,
    streetView: 'https://maps.example/x',
    descricao: null,
    restricao: null,
    statusExibicao: StatusExibicao.Ativo,
    fonteOrigem: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PecaService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PecaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lista peças de um local filtrando em memória (GET real não tem rota escopada por local)', () => {
    let resultado: unknown;
    service.listPecasByLocal(9).subscribe((r) => (resultado = r));

    const req = httpMock.expectOne(`${environment.bffUrl}/pecas`);
    expect(req.request.method).toBe('GET');
    req.flush([
      { id: 1, codigo: 'A', idLocal: 9, localCodigo: 'LOC-9', formatoDimensao: null, valorPadrao: 1, fonteOrigem: 1 },
      { id: 2, codigo: 'B', idLocal: 5, localCodigo: 'LOC-5', formatoDimensao: null, valorPadrao: 1, fonteOrigem: 1 },
    ]);

    expect((resultado as { id: number }[]).length).toBe(1);
    expect((resultado as { id: number }[])[0].id).toBe(1);
  });

  it('cria peça em POST {bffUrl}/pecas traduzindo o form flat para o comando aninhado (Via/Formato/EspecificacaoProducao)', () => {
    service.createPeca(payload).subscribe();
    const req = httpMock.expectOne(`${environment.bffUrl}/pecas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.idLocal).toBe(9);
    expect(req.request.body.formato).toEqual({ largura: 3, altura: 2, juncao: 0 });
    expect(req.request.body.via).toEqual({ viaTipo: 0, faixas: 2, velociade: 60, pedestre: 0 });
    req.flush({ success: true, data: { peca: { id: 1 } } });
  });

  it('edita peça em PUT {bffUrl}/pecas/{id} sem permitir mover para outro local (idLocal vem fixo da rota)', () => {
    service.updatePeca(3, payload).subscribe();
    const req = httpMock.expectOne(`${environment.bffUrl}/pecas/3`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.idLocal).toBe(9);
    req.flush({ success: true, data: { peca: { id: 3 } } });
  });

  it('busca detalhe da peça em GET {bffUrl}/pecas/{id} traduzindo o shape aninhado para flat', () => {
    let detalhe: any;
    service.getPeca(3).subscribe((d) => (detalhe = d));
    const req = httpMock.expectOne(`${environment.bffUrl}/pecas/3`);
    expect(req.request.method).toBe('GET');
    req.flush(apiDetalhe);

    expect(detalhe.formatoLargura).toBe(3);
    expect(detalhe.viaFaixas).toBe(2);
    expect(detalhe.especificacaoTexto).toBe('texto');
    expect(detalhe.streetView).toBe('https://maps.example/x');
  });
});
