import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PedidosInsercaoComponent } from './pedidos-insercao.component';
import { PedidosInsercaoService } from '../../core/services/pedidos.service';
import { environment } from '../../../environments/environment';

/**
 * VEI-RD-94 (Figma `154:7083`).
 *
 * `resumo` vem NA MESMA resposta da listagem — os testes fixam isso, e que os
 * títulos dos cards "por status" usam os status oficiais do domínio
 * (Checking, Veiculado), nunca os rótulos mock do Figma.
 */
describe('PedidosInsercaoComponent', () => {
  let httpMock: HttpTestingController;
  const base = `${environment.bffUrl}/pedidos-insercao`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PedidosInsercaoService, provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function respostaPadrao() {
    return {
      itens: [
        {
          id: 1,
          codigo: 'PI-2026-0311',
          dataCadastro: '2026-08-01T10:30:00',
          dataPedido: '2026-07-30T09:00:00',
          status: 'Novo',
          campanha: 'Campanha Y',
          agencia: 'Venda Direta (Sem Agência)',
          anunciante: 'Cliente Y',
          valorLiquidoVeiculacao: 100,
          itensCount: 3,
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPaginas: 1,
      resumo: {
        totalPIs: 1,
        totalPecas: 3,
        valorLiquidoTotal: 100,
        porStatus: [
          { status: 'Novo', quantidade: 1, valor: 100 },
          { status: 'Aprovado', quantidade: 0, valor: 0 },
          { status: 'Checking', quantidade: 2, valor: 50 },
          { status: 'Veiculado', quantidade: 4, valor: 400 },
          { status: 'Rejeitado', quantidade: 0, valor: 0 },
          { status: 'Cancelado', quantidade: 0, valor: 0 },
        ],
      },
    };
  }

  function criar(): PedidosInsercaoComponent {
    const fixture = TestBed.createComponent(PedidosInsercaoComponent);
    const componente = fixture.componentInstance;
    componente.ngOnInit();

    httpMock.expectOne((r) => r.url === base).flush(respostaPadrao());

    return componente;
  }

  it('lista PIs paginadas em GET {bffUrl}/pedidos-insercao', () => {
    const componente = criar();

    expect(componente.pedidos.length).toBe(1);
    expect(componente.pedidos[0].codigo).toBe('PI-2026-0311');
    expect(componente.total).toBe(1);
  });

  it('agencia vazia nunca vira travessao: o servidor ja manda "Venda Direta (Sem Agência)"', () => {
    const componente = criar();
    expect(componente.pedidos[0].agencia).toBe('Venda Direta (Sem Agência)');
  });

  it('resumo vem na mesma resposta, nao de uma rota separada', () => {
    const componente = criar();
    expect(componente.resumo?.totalPIs).toBe(1);
    expect(componente.resumo?.totalPecas).toBe(3);
    expect(componente.resumo?.valorLiquidoTotal).toBe(100);
  });

  it('os 2 cards "por status" leem Checking e Veiculado, os status oficiais — nao rotulos do Figma', () => {
    const componente = criar();
    expect(componente.quantidadePorStatus(componente.resumo!, 'Checking')).toBe(2);
    expect(componente.quantidadePorStatus(componente.resumo!, 'Veiculado')).toBe(4);
  });

  it('opcoes de status do filtro sao exatamente os 6 oficiais, sem rotulos mock do Figma', () => {
    const componente = criar();
    const valores = componente.opcoesStatus.map((o) => o.valor).filter((v) => v !== '');
    expect(valores).toEqual(['Novo', 'Aprovado', 'Checking', 'Veiculado', 'Rejeitado', 'Cancelado']);
    expect(valores).not.toContain('Faturado');
    expect(valores).not.toContain('Aguardando Assinatura');
    expect(valores).not.toContain('Em Veiculação');
  });

  it('busca, status e ordenacao vao na query string', () => {
    const componente = criar();

    componente.mudarStatus('Checking');
    let req = httpMock.expectOne((r) => r.url === base && r.params.get('page') === '1');
    expect(req.request.params.get('status')).toBe('Checking');
    req.flush(respostaPadrao());

    componente.mudarOrdenacao('cidade');
    req = httpMock.expectOne((r) => r.url === base && r.params.get('page') === '1');
    expect(req.request.params.get('sort')).toBe('cidade');
    req.flush(respostaPadrao());
  });

  it('trocar filtro busca volta para a primeira pagina', () => {
    const componente = criar();

    componente.carregar(2);
    httpMock
      .expectOne((r) => r.url === base && r.params.get('page') === '2')
      .flush({ ...respostaPadrao(), itens: [], page: 2, total: 30, totalPaginas: 2 });
    expect(componente.page).toBe(2);

    componente.mudarStatus('Novo');
    const req = httpMock.expectOne((r) => r.url === base && r.params.get('page') === '1');
    expect(req.request.params.get('status')).toBe('Novo');
    req.flush(respostaPadrao());
  });

  it('respeita o pageSize devolvido pelo servidor, nao o pedido', () => {
    const componente = TestBed.createComponent(PedidosInsercaoComponent).componentInstance;
    componente.pageSize = 5000;
    componente.ngOnInit();

    httpMock
      .expectOne((r) => r.url === base)
      .flush({ ...respostaPadrao(), itens: [], pageSize: 100, total: 0, totalPaginas: 0 });

    expect(componente.pageSize).toBe(100);
  });

  it('baixa o PDF pelo BFF em mesma origem, como blob, sem tocar o FileServer', () => {
    const componente = criar();
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    componente.baixarPi('PI-2026-0311');

    const req = httpMock.expectOne(`${base}/PI-2026-0311/pdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');

    // A URL e relativa ao proprio painel: nenhum host externo no caminho.
    expect(req.request.url.startsWith('/api/wl/')).toBe(true);
    expect(req.request.url).not.toContain('fileserver');

    req.flush(new Blob(['%PDF-'], { type: 'application/pdf' }));

    expect(abrir).toHaveBeenCalledWith('blob:local', '_blank');
    expect(componente.baixando).toBeNull();
  });

  it('falha ao abrir o PDF vira mensagem na tela, sem navegar para pagina quebrada', () => {
    const componente = criar();

    componente.baixarPi('PI-2026-0311');

    httpMock
      .expectOne(`${base}/PI-2026-0311/pdf`)
      .flush(null, { status: 502, statusText: 'Bad Gateway' });

    expect(componente.baixando).toBeNull();
    expect(componente.erro).toBeTruthy();
    expect(componente.erro).not.toContain('fileserver');
  });

  it('ignora clique repetido enquanto um download esta em curso', () => {
    const componente = criar();

    componente.baixarPi('PI-2026-0311');
    componente.baixarPi('PI-2026-0311');

    // Uma unica requisicao: a segunda chamada saiu pelo guard de `baixando`.
    httpMock.expectOne(`${base}/PI-2026-0311/pdf`).flush(new Blob(['%PDF-']));
  });
});
