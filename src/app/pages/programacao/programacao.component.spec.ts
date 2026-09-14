import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProgramacaoComponent } from './programacao.component';
import { environment } from '../../../environments/environment';

/**
 * Programacao — card `473d740b`, item 5 do roteiro de validacao visual.
 *
 * O componente pivota a lista plana do BFF em linhas (peca) x colunas (periodo).
 * Essa transformacao nao tinha nenhum teste, e e onde um erro passa despercebido:
 * a tela continua renderizando, so que com a peca errada na coluna errada.
 */
describe('ProgramacaoComponent', () => {
  let httpMock: HttpTestingController;

  const rotaGrade = `${environment.bffUrl}/programacao/listar`;
  const rotaLocais = `${environment.bffUrl}/locais`;
  const rotaPeriodos = `${environment.bffUrl}/lookups/periodos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /** Envelope de paginacao: `total` conta PECAS (linhas), nao celulas. */
  function pagina(itens: unknown[], total?: number) {
    return {
      itens,
      page: 1,
      pageSize: 25,
      total: total ?? new Set(itens.map((i) => (i as { pecaId: number }).pecaId)).size,
      totalPaginas: itens.length === 0 ? 0 : 1,
    };
  }

  /** Resolve os tres GETs/POSTs que o ngOnInit dispara. */
  function criar(
    itens: unknown[],
    periodos: unknown[] = [{ id: 10, nome: 'Bi-1' }, { id: 20, nome: 'Bi-2' }]
  ): ProgramacaoComponent {
    const componente = TestBed.createComponent(ProgramacaoComponent).componentInstance;
    componente.ngOnInit();

    httpMock.expectOne(rotaLocais).flush([]);
    httpMock.expectOne(rotaPeriodos).flush(periodos);
    httpMock.expectOne((r) => r.url === rotaGrade).flush(pagina(itens));

    return componente;
  }

  it('envia o filtro no corpo do POST, com null para "todos"', () => {
    const componente = TestBed.createComponent(ProgramacaoComponent).componentInstance;
    componente.ngOnInit();

    httpMock.expectOne(rotaLocais).flush([]);
    httpMock.expectOne(rotaPeriodos).flush([]);

    const req = httpMock.expectOne((r) => r.url === rotaGrade);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ idPeriodo: null, idLocal: null });
    // O tenant vem do Host: a UI nunca manda afiliada.
    expect(req.request.body).not.toHaveProperty('afiliadaId');
    // Paginacao vai na query string, nao no filtro de dominio.
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pagina([]));
  });

  it('pivota a lista plana em linhas por peca e colunas por periodo', () => {
    const componente = criar([
      { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 10, periodoNome: 'Bi-1', status: 'Livre' },
      { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 20, periodoNome: 'Bi-2', status: 'Reservado' },
      { pecaId: 2, pecaCodigo: 'P2', localCodigo: 'L1', periodoId: 10, periodoNome: 'Bi-1', status: 'Vendido' },
    ]);

    expect(componente.linhas.length).toBe(2);
    expect(componente.colunas.map((c) => c.id)).toEqual([10, 20]);

    const p1 = componente.linhas.find((l) => l.pecaId === 1)!;
    expect(p1.statusPorPeriodo.get(10)).toBe('Livre');
    expect(p1.statusPorPeriodo.get(20)).toBe('Reservado');

    const p2 = componente.linhas.find((l) => l.pecaId === 2)!;
    expect(p2.statusPorPeriodo.get(10)).toBe('Vendido');
    expect(p2.statusPorPeriodo.has(20)).toBe(false);
  });

  it('ordena colunas pela ordem do lookup e linhas por local e peca', () => {
    const componente = criar(
      [
        { pecaId: 2, pecaCodigo: 'P2', localCodigo: 'L2', periodoId: 20, periodoNome: 'Bi-2', status: 'Livre' },
        { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 10, periodoNome: 'Bi-1', status: 'Livre' },
      ],
      [{ id: 10, nome: 'Bi-1' }, { id: 20, nome: 'Bi-2' }]
    );

    expect(componente.colunas.map((c) => c.id)).toEqual([10, 20]);
    expect(componente.linhas.map((l) => l.localCodigo)).toEqual(['L1', 'L2']);
  });

  it('periodo fora do lookup vai para o fim das colunas em vez de sumir', () => {
    const componente = criar(
      [
        { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 99, periodoNome: 'Desconhecido', status: 'Livre' },
        { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 10, periodoNome: 'Bi-1', status: 'Livre' },
      ],
      [{ id: 10, nome: 'Bi-1' }]
    );

    expect(componente.colunas.map((c) => c.id)).toEqual([10, 99]);
  });

  it('grade vazia nao inventa linhas nem colunas', () => {
    const componente = criar([]);

    expect(componente.linhas).toEqual([]);
    expect(componente.colunas).toEqual([]);
    expect(componente.erro).toBeNull();
  });

  it('falha da grade limpa o resultado anterior em vez de manter numeros velhos', () => {
    const componente = criar([
      { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 10, periodoNome: 'Bi-1', status: 'Livre' },
    ]);
    expect(componente.linhas.length).toBe(1);

    componente.carregar();
    httpMock.expectOne((r) => r.url === rotaGrade).flush(null, { status: 500, statusText: 'Erro' });

    expect(componente.erro).toBeTruthy();
    expect(componente.linhas).toEqual([]);
    expect(componente.colunas).toEqual([]);
  });

  it('trocar filtro volta para a primeira pagina', () => {
    const componente = criar([
      { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 10, periodoNome: 'Bi-1', status: 'Livre' },
    ]);

    componente.carregar(2);
    httpMock
      .expectOne((r) => r.url === rotaGrade && r.params.get('page') === '2')
      .flush({ itens: [], page: 2, pageSize: 25, total: 30, totalPaginas: 2 });
    expect(componente.page).toBe(2);

    // A pagina 2 do filtro antigo nao corresponde a nada no filtro novo.
    componente.idLocal = 99;
    componente.aplicarFiltro();

    const req = httpMock.expectOne((r) => r.url === rotaGrade && r.params.get('page') === '1');
    expect(req.request.body.idLocal).toBe(99);
    req.flush(pagina([]));
  });

  it('paginacao conta pecas, nao celulas da grade', () => {
    const componente = TestBed.createComponent(ProgramacaoComponent).componentInstance;
    componente.ngOnInit();

    httpMock.expectOne(rotaLocais).flush([]);
    httpMock.expectOne(rotaPeriodos).flush([{ id: 10, nome: 'Bi-1' }, { id: 20, nome: 'Bi-2' }]);

    // Duas pecas x dois periodos = 4 celulas, mas o total e 2.
    httpMock.expectOne((r) => r.url === rotaGrade).flush({
      itens: [
        { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 10, periodoNome: 'Bi-1', status: 'Livre' },
        { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 20, periodoNome: 'Bi-2', status: 'Livre' },
        { pecaId: 2, pecaCodigo: 'P2', localCodigo: 'L1', periodoId: 10, periodoNome: 'Bi-1', status: 'Livre' },
        { pecaId: 2, pecaCodigo: 'P2', localCodigo: 'L1', periodoId: 20, periodoNome: 'Bi-2', status: 'Livre' },
      ],
      page: 1,
      pageSize: 25,
      total: 2,
      totalPaginas: 1,
    });

    expect(componente.linhas.length).toBe(2);
    expect(componente.total).toBe(2);
  });

  it('falha nos lookups nao impede a grade de carregar', () => {
    const componente = TestBed.createComponent(ProgramacaoComponent).componentInstance;
    componente.ngOnInit();

    httpMock.expectOne(rotaLocais).flush(null, { status: 500, statusText: 'Erro' });
    httpMock.expectOne(rotaPeriodos).flush(null, { status: 500, statusText: 'Erro' });
    httpMock.expectOne((r) => r.url === rotaGrade).flush(pagina([
      { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 10, periodoNome: 'Bi-1', status: 'Livre' },
    ]));

    expect(componente.locais).toEqual([]);
    expect(componente.periodos).toEqual([]);
    expect(componente.linhas.length).toBe(1);
  });
});
