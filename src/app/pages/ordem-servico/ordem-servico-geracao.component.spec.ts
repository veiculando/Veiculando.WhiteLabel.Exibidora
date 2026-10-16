import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { OrdemServicoGeracaoComponent } from './ordem-servico-geracao.component';
import { environment } from '../../../environments/environment';
import { Periodicidade } from '../../core/models/wl.models';

/**
 * OS — geração (VEI-RD-88b, Figma `186:86`).
 *
 * `OrdensServicoController` real (BFF, 2026-09-22) não tem
 * `/pecas-elegiveis` nem recebe `opcoes` no `POST /api/wl/ordens-servico`
 * (só `idPeriodo`/`idPecas`) — a busca de peças reusa
 * `POST /api/wl/programacao/listar` (VEI-RD-86), e a resposta de criação não
 * devolve o período (o componente usa o que já tem localmente).
 */
describe('OrdemServicoGeracaoComponent', () => {
  let httpMock: HttpTestingController;
  const baseOs = `${environment.bffUrl}/ordens-servico`;
  const baseProgramacao = `${environment.bffUrl}/programacao/listar`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function criar() {
    const componente = TestBed.createComponent(OrdemServicoGeracaoComponent).componentInstance;
    componente.ngOnInit();

    httpMock
      .expectOne((r) => r.url === `${environment.bffUrl}/lookups/periodos` && r.params.get('periodicidade') === String(Periodicidade.Bissemanal))
      .flush([{ id: 10, nome: 'Bissemana 16', dataInicio: '2026-08-01', dataFim: '2026-08-14' }]);
    httpMock.expectOne((r) => r.url === `${environment.bffUrl}/lookups/cidades`).flush([]);
    httpMock.expectOne(`${baseOs}/operadores`).flush([]);

    return componente;
  }

  it('busca pecas via POST {bffUrl}/programacao/listar, pinando o mesmo periodo nos dois limites', () => {
    const componente = criar();
    componente.idPeriodo = 10;

    componente.buscarPecas();

    const req = httpMock.expectOne((r) => r.url === baseProgramacao);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.idPeriodoInicial).toBe(10);
    expect(req.request.body.idPeriodoFinal).toBe(10);
    req.flush({
      itens: [
        { pecaId: 1, pecaCodigo: 'PC-1', localId: 1, localCodigo: 'L-1', periodoId: 10, periodoNome: 'Bissemana 16', status: 'Autorizada', endereco: 'Rua A', bairro: 'Centro' },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
      totalPaginas: 1,
    });

    expect(componente.pecas.length).toBe(1);
  });

  it('nao chama /pecas-elegiveis (endpoint que nao existe no BFF real)', () => {
    const componente = criar();
    componente.idPeriodo = 10;
    componente.buscarPecas();

    httpMock.expectNone(`${baseOs}/pecas-elegiveis`);
    httpMock.expectOne((r) => r.url === baseProgramacao).flush({ itens: [], page: 1, pageSize: 100, total: 0, totalPaginas: 0 });
  });

  it('selecionar todas marca/desmarca todas as pecas buscadas', () => {
    const componente = criar();
    componente.idPeriodo = 10;
    componente.buscarPecas();
    httpMock.expectOne((r) => r.url === baseProgramacao).flush({
      itens: [
        { pecaId: 1, pecaCodigo: 'PC-1', localId: 1, localCodigo: 'L-1', periodoId: 10, periodoNome: 'Bissemana 16', status: 'Autorizada' },
        { pecaId: 2, pecaCodigo: 'PC-2', localId: 1, localCodigo: 'L-1', periodoId: 10, periodoNome: 'Bissemana 16', status: 'Autorizada' },
      ],
      page: 1,
      pageSize: 100,
      total: 2,
      totalPaginas: 1,
    });

    componente.selecionarTodas(true);
    expect(componente.selecionadas.size).toBe(2);
    expect(componente.todasSelecionadas()).toBe(true);

    componente.selecionarTodas(false);
    expect(componente.selecionadas.size).toBe(0);
  });

  it('gerar OS sem peca selecionada nao chama o servico', () => {
    const componente = criar();
    componente.idPeriodo = 10;
    componente.gerarOs();
    httpMock.expectNone(baseOs);
  });

  it('mostra colador e fiscal na tela e envia os ids escolhidos, sem modal de escolha', () => {
    const componente = criar();
    componente.carregarOperadores();
    const req = httpMock.expectOne(`${baseOs}/operadores`);
    expect(req.request.method).toBe('GET');
    req.flush([
      { id: 9, nome: 'Ana', colador: true, fiscal: true },
      { id: 4, nome: 'Bia', colador: false, fiscal: true },
    ]);

    expect(componente.opcoesColador.map((o) => o.rotulo)).toEqual(['Nenhum', 'Ana']);
    expect(componente.opcoesFiscal.map((o) => o.rotulo)).toEqual(['Nenhum', 'Ana', 'Bia']);

    componente.idPeriodo = 10;
    componente.selecionadas.add(1);
    componente.idColador = 9;
    componente.idFiscal = 4;
    componente.gerarOs();

    const criarReq = httpMock.expectOne(baseOs);
    expect(criarReq.request.body).toEqual({ idPeriodo: 10, idPecas: [1], idColador: 9, idFiscal: 4 });
    criarReq.flush({ id: 99, numeroFormatado: 'OS #0042', pecasCount: 1, status: 'Pendente' });
    expect(componente.modalAberto).toBe(true);
  });

  it('gerar OS envia idPeriodo/idPecas e atribuicao vazia, e abre o modal com o periodo conhecido localmente', () => {
    const componente = criar();
    componente.idPeriodo = 10;
    componente.selecionadas.add(1);

    componente.gerarOs();

    const req = httpMock.expectOne(baseOs);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ idPeriodo: 10, idPecas: [1], idColador: null, idFiscal: null });
    req.flush({ id: 99, numeroFormatado: 'OS #0042', pecasCount: 1 });

    expect(componente.modalAberto).toBe(true);
    expect(componente.contextoEntrega).toEqual({
      id: 99,
      numeroFormatado: 'OS #0042',
      pecasCount: 1,
      periodoNome: 'Bissemana 16',
    });
  });

  it('trocar periodicidade recarrega periodos e limpa o periodo selecionado', () => {
    const componente = criar();
    componente.idPeriodo = 10;

    componente.mudarPeriodicidade(String(Periodicidade.Mensal));

    expect(componente.idPeriodo).toBeNull();
    httpMock
      .expectOne((r) => r.url === `${environment.bffUrl}/lookups/periodos` && r.params.get('periodicidade') === String(Periodicidade.Mensal))
      .flush([]);
  });

  it('ao fechar o modal, navega para o detalhe da OS recem-criada', () => {
    const componente = criar();
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    componente.idPeriodo = 10;
    componente.selecionadas.add(1);
    componente.gerarOs();
    httpMock.expectOne(baseOs).flush({ id: 99, numeroFormatado: 'OS #0042', pecasCount: 1 });

    componente.fecharModalEIrParaDetalhe();

    expect(navegar).toHaveBeenCalledWith(['/ordens-servico', 99]);
  });
});
