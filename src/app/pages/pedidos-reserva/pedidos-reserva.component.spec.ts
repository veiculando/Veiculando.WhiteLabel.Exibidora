import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PedidosReservaComponent } from './pedidos-reserva.component';
import { PedidosReservaService } from '../../core/services/pedidos.service';
import { environment } from '../../../environments/environment';

/**
 * Pedidos de reserva — card `67d92ac5`, item 6 do roteiro de validacao visual.
 *
 * O contrato passou a ser por item: uma decisao para cada item pendente, nem a
 * mais nem a menos. Omitir um item o deixaria pendente para sempre com o pedido
 * ja respondido, entao o servidor recusa payload incompleto — e a UI precisa
 * carregar o detalhe antes de conseguir responder.
 */
describe('PedidosReservaComponent', () => {
  let httpMock: HttpTestingController;
  const base = `${environment.bffUrl}/pedidos-reserva`;

  const pedido = {
    id: 7,
    codigo: 'PR-7',
    status: 'Solicitado',
    dataCadastro: '2026-08-01',
    agencia: 'Agencia X',
    cliente: 'Cliente Y',
    itensCount: 2,
  };

  const detalhe = {
    id: 7,
    codigo: 'PR-7',
    status: 'Solicitado',
    dataCadastro: '2026-08-01',
    agencia: 'Agencia X',
    cliente: 'Cliente Y',
    valorTotalBruto: 500,
    itens: [
      { id: 11, pecaCodigo: 'P1', localCodigo: 'L1', status: 'Solicitado' },
      { id: 12, pecaCodigo: 'P2', localCodigo: 'L1', status: 'Solicitado' },
    ],
  };

  function pagina(itens: unknown[], extra: Partial<Record<string, number>> = {}) {
    return {
      itens,
      page: 1,
      pageSize: 25,
      total: itens.length,
      totalPaginas: itens.length === 0 ? 0 : 1,
      ...extra,
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PedidosReservaService, provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function criar(lista: unknown[] = [pedido]): PedidosReservaComponent {
    const componente = TestBed.createComponent(PedidosReservaComponent).componentInstance;
    componente.ngOnInit();
    httpMock.expectOne((r) => r.url === base).flush(pagina(lista));
    return componente;
  }

  function abrirDetalhe(componente: PedidosReservaComponent): void {
    componente.alternarDetalhe(componente.pedidos[0]);
    httpMock.expectOne(`${base}/PR-7`).flush(detalhe);
  }

  it('lista reservas paginadas sem enviar afiliadaId', () => {
    const componente = TestBed.createComponent(PedidosReservaComponent).componentInstance;
    componente.ngOnInit();

    const req = httpMock.expectOne((r) => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('afiliadaId')).toBe(false);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pagina([pedido]));

    expect(componente.pedidos.length).toBe(1);
    expect(componente.total).toBe(1);
  });

  it('respeita o pageSize que o servidor devolve, nao o pedido', () => {
    const componente = TestBed.createComponent(PedidosReservaComponent).componentInstance;
    componente.pageSize = 5000;
    componente.ngOnInit();

    httpMock
      .expectOne((r) => r.url === base)
      .flush({ itens: [pedido], page: 1, pageSize: 100, total: 1, totalPaginas: 1 });

    expect(componente.pageSize).toBe(100);
  });

  it('navegar de pagina pede a pagina nova ao servidor', () => {
    const componente = criar();

    componente.carregar(2);
    const req = httpMock.expectOne((r) => r.url === base && r.params.get('page') === '2');
    req.flush({ itens: [], page: 2, pageSize: 25, total: 30, totalPaginas: 2 });

    expect(componente.page).toBe(2);
  });

  it('lista vazia mostra estado vazio sem erro', () => {
    const componente = criar([]);

    expect(componente.pedidos).toEqual([]);
    expect(componente.erro).toBeNull();
  });

  it('falha na listagem limpa os dados e mostra erro', () => {
    const componente = TestBed.createComponent(PedidosReservaComponent).componentInstance;
    componente.ngOnInit();
    httpMock.expectOne((r) => r.url === base).flush(null, { status: 500, statusText: 'Erro' });

    expect(componente.erro).toBeTruthy();
    expect(componente.pedidos).toEqual([]);
  });

  it('abrir detalhe carrega itens e inicia todas as decisoes como aceitar', () => {
    const componente = criar();
    abrirDetalhe(componente);

    expect(componente.expandido).toBe('PR-7');
    expect(componente.detalhe!.itens.length).toBe(2);
    expect(componente.aceitaItem(11)).toBe(true);
    expect(componente.aceitaItem(12)).toBe(true);
    expect(componente.resumoDecisoes).toEqual({ aceitos: 2, rejeitados: 0 });
  });

  /** Cenario 2: aceita alguns, recusa outros — cada item exatamente uma vez. */
  it('resposta mista envia a decisao de cada item uma unica vez', () => {
    const componente = criar();
    abrirDetalhe(componente);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    componente.alternarItem(12);
    expect(componente.resumoDecisoes).toEqual({ aceitos: 1, rejeitados: 1 });

    componente.enviarResposta(componente.pedidos[0]);

    const req = httpMock.expectOne(`${base}/resposta`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      pedidoReservaId: 7,
      itens: [
        { idItemPedidoReserva: 11, aceitar: true },
        { idItemPedidoReserva: 12, aceitar: false },
      ],
    });

    // O campo `aceitar` de nivel superior nao existe mais — duas fontes de
    // verdade para a mesma pergunta.
    expect(req.request.body).not.toHaveProperty('aceitar');

    req.flush({ message: 'Resposta registrada: 1 item(ns) aceito(s) e 1 recusado(s).', aceitos: 1, rejeitados: 1 });

    expect(componente.aviso).toContain('1 item(ns) aceito(s)');
    httpMock.expectOne((r) => r.url === base).flush(pagina([]));
  });

  it('enviar sempre inclui TODOS os itens do detalhe, nunca um subconjunto', () => {
    const componente = criar();
    abrirDetalhe(componente);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    componente.enviarResposta(componente.pedidos[0]);

    const req = httpMock.expectOne(`${base}/resposta`);
    const enviados = (req.request.body.itens as { idItemPedidoReserva: number }[]).map(
      (i) => i.idItemPedidoReserva
    );

    expect(enviados).toEqual([11, 12]);
    expect(new Set(enviados).size).toBe(enviados.length);

    req.flush({ message: 'ok', aceitos: 2, rejeitados: 0 });
    httpMock.expectOne((r) => r.url === base).flush(pagina([]));
  });

  it('"aceitar tudo" com detalhe aberto marca todos e envia', () => {
    const componente = criar();
    abrirDetalhe(componente);
    componente.alternarItem(11);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    componente.responderTudo(componente.pedidos[0], true);

    const req = httpMock.expectOne(`${base}/resposta`);
    expect(req.request.body.itens).toEqual([
      { idItemPedidoReserva: 11, aceitar: true },
      { idItemPedidoReserva: 12, aceitar: true },
    ]);
    req.flush({ message: 'ok', aceitos: 2, rejeitados: 0 });
    httpMock.expectOne((r) => r.url === base).flush(pagina([]));
  });

  /**
   * Sem o detalhe nao ha ids de item, e mandar payload incompleto so produziria
   * um 400. A tela abre o detalhe em vez de tentar.
   */
  it('"aceitar tudo" sem detalhe aberto carrega o detalhe e nao chama /resposta', () => {
    const componente = criar();

    componente.responderTudo(componente.pedidos[0], true);

    httpMock.expectOne(`${base}/PR-7`).flush(detalhe);
    expect(componente.erro).toContain('Abra o detalhe');
    // Nenhum POST: o verify() do afterEach cobra.
  });

  it('cancelar a confirmacao nao chama o BFF', () => {
    const componente = criar();
    abrirDetalhe(componente);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    componente.enviarResposta(componente.pedidos[0]);

    expect(componente.respondendo).toBeNull();
  });

  it('conflito 409 vira mensagem e libera os botoes', () => {
    const componente = criar();
    abrirDetalhe(componente);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    componente.enviarResposta(componente.pedidos[0]);

    httpMock
      .expectOne(`${base}/resposta`)
      .flush({ message: 'Este pedido não está mais disponível para resposta.' },
        { status: 409, statusText: 'Conflict' });

    expect(componente.erro).toBeTruthy();
    expect(componente.respondendo).toBeNull();
    expect(componente.aviso).toBeNull();
  });

  it('recolher o detalhe limpa as decisoes pendentes', () => {
    const componente = criar();
    abrirDetalhe(componente);
    componente.alternarItem(11);

    componente.alternarDetalhe(componente.pedidos[0]);

    expect(componente.expandido).toBeNull();
    expect(componente.detalhe).toBeNull();
    expect(componente.resumoDecisoes).toEqual({ aceitos: 0, rejeitados: 0 });
  });
});
