import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PedidosInsercaoComponent } from './pedidos-insercao.component';
import { PedidosInsercaoService } from '../../core/services/pedidos.service';
import { environment } from '../../../environments/environment';
import { PermissionService } from '../../core/auth/permission.service';
import { pedidosInsercaoListaReal } from '../../../testing/contratos/contratos';

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
  const periodos = `${environment.bffUrl}/lookups/periodos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PedidosInsercaoService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PermissionService, useValue: { getAfiliadaId: () => '4821' } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /**
   * Parte da resposta REAL do BFF (fixture de contrato) e só troca os valores
   * que os testes abaixo afirmam — as chaves continuam as do servidor.
   */
  function respostaPadrao() {
    const real = pedidosInsercaoListaReal();
    return {
      ...real,
      itens: [
        {
          ...real.itens[0],
          codigo: 'PI-2026-0311',
          agencia: 'Venda Direta (Sem Agência)',
          itensCount: 3,
        },
      ],
      pageSize: 25,
      total: 1,
      resumo: {
        ...real.resumo,
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

    httpMock.expectOne((r) => r.url === periodos).flush([]);
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
    httpMock.expectOne((r) => r.url === periodos).flush([]);

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

  it('filtro de Período vem de lookups/periodos e vai como periodoId (D8)', () => {
    const fixture = TestBed.createComponent(PedidosInsercaoComponent);
    const componente = fixture.componentInstance;
    componente.ngOnInit();
    httpMock
      .expectOne((r) => r.url === periodos)
      .flush([{ id: 7, nome: 'Agosto De 2026', dataInicio: '2026-08-01T00:00:00', dataFim: '2026-08-31T00:00:00' }]);
    httpMock.expectOne((r) => r.url === base).flush(respostaPadrao());

    expect(componente.opcoesPeriodo).toEqual([
      { valor: '', rotulo: 'Todos' },
      { valor: '7', rotulo: 'Agosto De 2026' },
    ]);

    componente.mudarPeriodo('7');
    let req = httpMock.expectOne((r) => r.url === base && r.params.get('page') === '1');
    expect(req.request.params.get('periodoId')).toBe('7');
    req.flush(respostaPadrao());

    componente.limparFiltros();
    req = httpMock.expectOne((r) => r.url === base && r.params.get('page') === '1');
    expect(req.request.params.has('periodoId')).toBe(false);
    req.flush(respostaPadrao());
  });

  it('falha no lookup de períodos não bloqueia a lista', () => {
    const componente = TestBed.createComponent(PedidosInsercaoComponent).componentInstance;
    componente.ngOnInit();
    httpMock.expectOne((r) => r.url === periodos).flush(null, { status: 500, statusText: 'Erro' });
    httpMock.expectOne((r) => r.url === base).flush(respostaPadrao());

    expect(componente.opcoesPeriodo).toEqual([{ valor: '', rotulo: 'Todos' }]);
    expect(componente.pedidos.length).toBe(1);
  });

  describe('tela com a resposta real do BFF (D8)', () => {
    async function montar(resposta: object = pedidosInsercaoListaReal()) {
      const fixture = TestBed.createComponent(PedidosInsercaoComponent);
      fixture.detectChanges();
      httpMock.expectOne((r) => r.url === periodos).flush([]);
      httpMock.expectOne((r) => r.url === base).flush(resposta);
      // Sem @Input mutado: o segundo detectChanges só re-renderiza o estado
      // que o flush já gravou; o whenStable espera o scheduler do Angular 22.
      fixture.detectChanges();
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;
      return { el, linhas: () => Array.from(el.querySelectorAll('tbody tr')) };
    }

    it('colunas Cidade e Período mostram os dados da PI, não travessão', async () => {
      const { linhas } = await montar();
      const primeira = linhas()[0].querySelectorAll('td');
      expect(primeira[1].textContent?.trim()).toBe('Sao Paulo');
      expect(primeira[2].textContent).toContain('P1 - de');
      expect(primeira[2].textContent).toContain('29/09 – 13/10');
    });

    it('PI em mais de uma cidade e mais de um período indica "+N"', async () => {
      const real = pedidosInsercaoListaReal();
      real.itens = [
        {
          ...real.itens[0],
          qtdCidades: 3,
          periodo: real.itens[0].periodo != null ? { ...real.itens[0].periodo, quantidade: 2 } : null,
        },
      ];
      const { linhas } = await montar(real);
      const celulas = linhas()[0].querySelectorAll('td');
      expect(celulas[1].textContent?.trim()).toBe('Sao Paulo +2');
      expect(celulas[2].textContent).toContain('+1');
    });

    it('PI sem período mostra travessão', async () => {
      const real = pedidosInsercaoListaReal();
      real.itens = [{ ...real.itens[0], cidade: null, qtdCidades: 0, periodo: null }];
      const { linhas } = await montar(real);
      const celulas = linhas()[0].querySelectorAll('td');
      expect(celulas[1].textContent?.trim()).toBe('—');
      expect(celulas[2].textContent?.trim()).toBe('—');
    });

    it('cabeçalho traz o badge da afiliada da sessão', async () => {
      const { el } = await montar();
      expect(el.querySelector('aurum-page-header')?.textContent).toContain('Afiliada #4821');
    });
  });
});
