import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PedidosReservaComponent } from './pedidos-reserva.component';
import { PedidosReservaService } from '../../core/services/pedidos.service';
import { environment } from '../../../environments/environment';

/**
 * Pedidos de reserva — card `67d92ac5`, item 6 do roteiro de validacao visual.
 *
 * A pagina nao tinha nenhum spec: aceitar, rejeitar e o detalhe dependiam
 * inteiramente de teste manual. O backend ja e coberto por `PedidosReservaTests`;
 * o que faltava era a rede de protecao do lado da UI.
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
    httpMock.expectOne(base).flush(lista);
    return componente;
  }

  it('lista reservas em GET {bffUrl}/pedidos-reserva sem enviar afiliadaId', () => {
    const componente = TestBed.createComponent(PedidosReservaComponent).componentInstance;
    componente.ngOnInit();

    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('afiliadaId')).toBe(false);
    req.flush([pedido]);

    expect(componente.pedidos.length).toBe(1);
    expect(componente.carregando).toBe(false);
  });

  it('lista vazia mostra estado vazio sem erro e sem dado simulado', () => {
    const componente = criar([]);

    expect(componente.pedidos).toEqual([]);
    expect(componente.erro).toBeNull();
  });

  it('falha na listagem vira mensagem de erro', () => {
    const componente = TestBed.createComponent(PedidosReservaComponent).componentInstance;
    componente.ngOnInit();
    httpMock.expectOne(base).flush(null, { status: 500, statusText: 'Erro' });

    expect(componente.erro).toBeTruthy();
    expect(componente.carregando).toBe(false);
  });

  it('detalhe carrega itens do pedido e alternar de novo recolhe', () => {
    const componente = criar();

    componente.alternarDetalhe(componente.pedidos[0]);

    httpMock.expectOne(`${base}/PR-7`).flush({
      id: 7,
      codigo: 'PR-7',
      status: 'Solicitado',
      dataCadastro: '2026-08-01',
      agencia: 'Agencia X',
      cliente: 'Cliente Y',
      valorTotalBruto: 500,
      itens: [{ id: 1, pecaCodigo: 'P1', localCodigo: 'L1', status: 'Solicitado' }],
    });

    expect(componente.expandido).toBe('PR-7');
    expect(componente.detalhe!.itens.length).toBe(1);
    expect(componente.carregandoDetalhe).toBe(false);

    // Recolher nao dispara nova requisicao — o httpMock.verify() do afterEach
    // e quem cobra isso.
    componente.alternarDetalhe(componente.pedidos[0]);
    expect(componente.expandido).toBeNull();
    expect(componente.detalhe).toBeNull();
  });

  it('aceitar envia {pedidoReservaId, aceitar} e recarrega a lista', () => {
    const componente = criar();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    componente.responder(componente.pedidos[0], true);

    const req = httpMock.expectOne(`${base}/resposta`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ pedidoReservaId: 7, aceitar: true });

    // O contrato do BFF nao tem campo de motivo — se um dia a UI passar a mandar
    // um, ele seria descartado no serializador e este teste avisa.
    expect(req.request.body).not.toHaveProperty('motivo');

    req.flush({ message: 'Reserva confirmada com sucesso.' });

    expect(componente.aviso).toBe('Reserva confirmada com sucesso.');
    expect(componente.respondendo).toBeNull();

    // `carregar()` roda de novo no sucesso.
    httpMock.expectOne(base).flush([]);
  });

  it('rejeitar envia aceitar=false', () => {
    const componente = criar();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    componente.responder(componente.pedidos[0], false);

    const req = httpMock.expectOne(`${base}/resposta`);
    expect(req.request.body).toEqual({ pedidoReservaId: 7, aceitar: false });
    req.flush({ message: 'Reserva rejeitada com sucesso.' });

    httpMock.expectOne(base).flush([]);
  });

  it('cancelar a confirmacao nao chama o BFF', () => {
    const componente = criar();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    componente.responder(componente.pedidos[0], true);

    expect(componente.respondendo).toBeNull();
    // Nenhuma requisicao pendente: o verify() do afterEach falha se sair alguma.
  });

  it('conflito 409 do BFF vira mensagem e libera os botoes', () => {
    const componente = criar();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    componente.responder(componente.pedidos[0], true);

    httpMock
      .expectOne(`${base}/resposta`)
      .flush({ message: 'Este pedido não está mais disponível para resposta.' },
        { status: 409, statusText: 'Conflict' });

    expect(componente.erro).toBeTruthy();
    expect(componente.respondendo).toBeNull();
    expect(componente.aviso).toBeNull();
  });
});
