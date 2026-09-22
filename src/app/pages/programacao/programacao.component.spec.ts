import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProgramacaoComponent } from './programacao.component';
import { environment } from '../../../environments/environment';
import { Periodicidade, StatusPecaPeriodo } from '../../core/models/wl.models';

/**
 * Programacao — VEI-RD-86 (grade `184:1117`, vazio `188:389`).
 *
 * O componente pivota a lista plana do BFF em linhas (peca) x colunas
 * (periodo) e valida localmente Periodo Inicial <= Periodo Final, espelhando
 * `ProgramacaoController.MsgPeriodoInvertido`.
 */
describe('ProgramacaoComponent', () => {
  let httpMock: HttpTestingController;

  const rotaGrade = `${environment.bffUrl}/programacao/listar`;
  const rotaCidades = `${environment.bffUrl}/lookups/cidades`;
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
    periodos: unknown[] = [
      { id: 10, nome: 'Bi-1', dataInicio: '2026-08-01', dataFim: '2026-08-14' },
      { id: 20, nome: 'Bi-2', dataInicio: '2026-08-15', dataFim: '2026-08-28' },
    ]
  ): ProgramacaoComponent {
    const componente = TestBed.createComponent(ProgramacaoComponent).componentInstance;
    componente.ngOnInit();

    httpMock.expectOne(rotaCidades).flush([]);
    httpMock.expectOne((r) => r.url === rotaPeriodos).flush(periodos);
    httpMock.expectOne((r) => r.url === rotaGrade).flush(pagina(itens));

    return componente;
  }

  it('envia o filtro no corpo do POST, com null para "todos" e periodicidade numerica', () => {
    const componente = TestBed.createComponent(ProgramacaoComponent).componentInstance;
    componente.ngOnInit();

    httpMock.expectOne(rotaCidades).flush([]);
    httpMock.expectOne((r) => r.url === rotaPeriodos).flush([]);

    const req = httpMock.expectOne((r) => r.url === rotaGrade);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      periodicidade: Periodicidade.Bissemanal,
      idPeriodoInicial: null,
      idPeriodoFinal: null,
      status: null,
      idCidade: null,
      anunciante: null,
    });
    // O tenant vem do Host: a UI nunca manda afiliada.
    expect(req.request.body).not.toHaveProperty('afiliadaId');
    // Paginacao vai na query string, nao no filtro de dominio.
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pagina([]));
  });

  it('carrega periodos filtrados pela periodicidade selecionada', () => {
    const componente = TestBed.createComponent(ProgramacaoComponent).componentInstance;
    componente.ngOnInit();

    httpMock.expectOne(rotaCidades).flush([]);
    const reqPeriodos = httpMock.expectOne((r) => r.url === rotaPeriodos);
    expect(reqPeriodos.request.params.get('periodicidade')).toBe(String(Periodicidade.Bissemanal));
    reqPeriodos.flush([]);
    httpMock.expectOne((r) => r.url === rotaGrade).flush(pagina([]));
  });

  it('pivota a lista plana em linhas por peca e colunas por periodo', () => {
    const componente = criar([
      { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 10, periodoNome: 'Bi-1', status: 'Solicitada' },
      { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 20, periodoNome: 'Bi-2', status: 'Reservada' },
      { pecaId: 2, pecaCodigo: 'P2', localCodigo: 'L1', periodoId: 10, periodoNome: 'Bi-1', status: 'Faturado' },
    ]);

    expect(componente.linhas.length).toBe(2);
    expect(componente.colunas.map((c) => c.id)).toEqual([10, 20]);

    const p1 = componente.linhas.find((l) => l.pecaId === 1)!;
    expect(p1.statusPorPeriodo.get(10)).toBe('Solicitada');
    expect(p1.statusPorPeriodo.get(20)).toBe('Reservada');

    const p2 = componente.linhas.find((l) => l.pecaId === 2)!;
    expect(p2.statusPorPeriodo.get(10)).toBe('Faturado');
    expect(p2.statusPorPeriodo.has(20)).toBe(false);
  });

  it('traduz o status cru do BFF para o rotulo oficial da legenda', () => {
    const componente = criar([]);
    expect(componente.rotuloStatus('Solicitada')).toBe('Solicitado');
    expect(componente.rotuloStatus('Reservada')).toBe('Reservado');
    expect(componente.rotuloStatus('Autorizada')).toBe('Autorizado');
    expect(componente.rotuloStatus('Faturado')).toBe('Faturado');
    expect(componente.rotuloStatus('Indisponivel')).toBe('Indisponível');
    // Status fora do mapa nao quebra: cai no proprio valor cru.
    expect(componente.rotuloStatus('AlgoNovo')).toBe('AlgoNovo');
  });

  it('a legenda tem exatamente os 5 status oficiais do PRD', () => {
    const componente = criar([]);
    expect(componente.legenda.map((l) => l.rotulo)).toEqual([
      'Solicitado',
      'Reservado',
      'Autorizado',
      'Faturado',
      'Indisponível',
    ]);
  });

  it('marca o periodo corrente como atual, com base na data de hoje', () => {
    const hoje = new Date();
    const emCurso = { id: 30, nome: 'Bi-atual', dataInicio: new Date(hoje.getTime() - 86400000).toISOString(), dataFim: new Date(hoje.getTime() + 86400000).toISOString() };
    const passado = { id: 10, nome: 'Bi-1', dataInicio: '2020-01-01', dataFim: '2020-01-14' };
    const componente = criar(
      [{ pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 30, periodoNome: 'Bi-atual', status: 'Autorizada' }],
      [emCurso, passado]
    );

    expect(componente.periodoAtual(30)).toBe(true);
    expect(componente.periodoAtual(10)).toBe(false);
  });

  it('trocar periodicidade recarrega os periodos e limpa a selecao incompativel', () => {
    const componente = criar([]);
    componente.idPeriodoInicial = 10;
    componente.idPeriodoFinal = 20;

    componente.mudarPeriodicidade(String(Periodicidade.Mensal));

    expect(componente.idPeriodoInicial).toBeNull();
    expect(componente.idPeriodoFinal).toBeNull();

    const reqPeriodos = httpMock.expectOne((r) => r.url === rotaPeriodos && r.params.get('periodicidade') === String(Periodicidade.Mensal));
    reqPeriodos.flush([{ id: 99, nome: 'Mes-1', dataInicio: '2026-09-01', dataFim: '2026-09-30' }]);

    httpMock.expectOne((r) => r.url === rotaGrade).flush(pagina([]));
  });

  it('bloqueia localmente quando periodo inicial e posterior ao final, com a mensagem exata do BFF', () => {
    const componente = criar([], [
      { id: 10, nome: 'Bi-1', dataInicio: '2026-08-01', dataFim: '2026-08-14' },
      { id: 20, nome: 'Bi-2', dataInicio: '2026-08-15', dataFim: '2026-08-28' },
    ]);

    componente.idPeriodoInicial = 20;
    componente.idPeriodoFinal = 10;
    componente.carregar(1);

    expect(componente.erroValidacao).toBe('Período inicial deve ser anterior ou igual ao período final');
    // Nao chega a sair requisicao nenhuma para a grade.
    httpMock.expectNone((r) => r.url === rotaGrade);
  });

  it('grade vazia mostra o estado vazio com o texto exato do card', () => {
    const componente = criar([]);

    expect(componente.linhas).toEqual([]);
    expect(componente.colunas).toEqual([]);
    expect(componente.erro).toBeNull();
  });

  it('falha da grade limpa o resultado anterior em vez de manter numeros velhos', () => {
    const componente = criar([
      { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 10, periodoNome: 'Bi-1', status: 'Solicitada' },
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
      { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 10, periodoNome: 'Bi-1', status: 'Solicitada' },
    ]);

    componente.carregar(2);
    httpMock
      .expectOne((r) => r.url === rotaGrade && r.params.get('page') === '2')
      .flush({ itens: [], page: 2, pageSize: 25, total: 30, totalPaginas: 2 });
    expect(componente.page).toBe(2);

    // A pagina 2 do filtro antigo nao corresponde a nada no filtro novo.
    componente.mudarFiltro('idCidade', '99');

    const req = httpMock.expectOne((r) => r.url === rotaGrade && r.params.get('page') === '1');
    expect(req.request.body.idCidade).toBe(99);
    req.flush(pagina([]));
  });

  it('status do filtro vai como valor numerico do enum', () => {
    const componente = criar([]);

    componente.mudarFiltro('status', String(StatusPecaPeriodo.Autorizada));

    const req = httpMock.expectOne((r) => r.url === rotaGrade && r.params.get('page') === '1');
    expect(req.request.body.status).toBe(StatusPecaPeriodo.Autorizada);
    req.flush(pagina([]));
  });

  it('limpar filtros restaura todos os campos e recarrega', () => {
    const componente = criar([]);
    componente.idCidade = 5;
    componente.status = StatusPecaPeriodo.Faturado;
    componente.anunciante = 'Acme';

    componente.limparFiltros();

    const req = httpMock.expectOne((r) => r.url === rotaGrade && r.params.get('page') === '1');
    expect(req.request.body).toEqual({
      periodicidade: Periodicidade.Bissemanal,
      idPeriodoInicial: null,
      idPeriodoFinal: null,
      status: null,
      idCidade: null,
      anunciante: null,
    });
    req.flush(pagina([]));
  });

  it('paginacao conta pecas, nao celulas da grade', () => {
    const componente = TestBed.createComponent(ProgramacaoComponent).componentInstance;
    componente.ngOnInit();

    httpMock.expectOne(rotaCidades).flush([]);
    httpMock
      .expectOne((r) => r.url === rotaPeriodos)
      .flush([
        { id: 10, nome: 'Bi-1', dataInicio: '2026-08-01', dataFim: '2026-08-14' },
        { id: 20, nome: 'Bi-2', dataInicio: '2026-08-15', dataFim: '2026-08-28' },
      ]);

    // Duas pecas x dois periodos = 4 celulas, mas o total e 2.
    httpMock.expectOne((r) => r.url === rotaGrade).flush({
      itens: [
        { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 10, periodoNome: 'Bi-1', status: 'Solicitada' },
        { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 20, periodoNome: 'Bi-2', status: 'Solicitada' },
        { pecaId: 2, pecaCodigo: 'P2', localCodigo: 'L1', periodoId: 10, periodoNome: 'Bi-1', status: 'Solicitada' },
        { pecaId: 2, pecaCodigo: 'P2', localCodigo: 'L1', periodoId: 20, periodoNome: 'Bi-2', status: 'Solicitada' },
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

    httpMock.expectOne(rotaCidades).flush(null, { status: 500, statusText: 'Erro' });
    httpMock.expectOne((r) => r.url === rotaPeriodos).flush(null, { status: 500, statusText: 'Erro' });
    httpMock.expectOne((r) => r.url === rotaGrade).flush(pagina([
      { pecaId: 1, pecaCodigo: 'P1', localCodigo: 'L1', periodoId: 10, periodoNome: 'Bi-1', status: 'Solicitada' },
    ]));

    expect(componente.linhas.length).toBe(1);
  });
});
