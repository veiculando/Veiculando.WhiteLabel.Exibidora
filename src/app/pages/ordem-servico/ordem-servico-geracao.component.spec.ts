import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { OrdemServicoGeracaoComponent } from './ordem-servico-geracao.component';
import { environment } from '../../../environments/environment';
import { Periodicidade } from '../../core/models/wl.models';

/**
 * OS — geração (VEI-RD-88b, Figma `186:86`). Após criar a OS, o modal de
 * entrega (VEI-RD-88c) abre automaticamente — sem essa etapa faltaria
 * caminho para imprimir a planilha logo depois de gerar.
 */
describe('OrdemServicoGeracaoComponent', () => {
  let httpMock: HttpTestingController;
  const base = `${environment.bffUrl}/ordens-servico`;

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

    return componente;
  }

  it('busca pecas elegiveis via POST {bffUrl}/ordens-servico/pecas-elegiveis', () => {
    const componente = criar();
    componente.idPeriodo = 10;

    componente.buscarPecas();

    const req = httpMock.expectOne(`${base}/pecas-elegiveis`);
    expect(req.request.method).toBe('POST');
    req.flush([
      { pecaId: 1, codigo: 'PC-1', tabu: 'T1', rota: 'R1', endereco: 'Rua A', bairro: 'Centro', campanhaAtual: null, campanhaAnterior: null, outQtd: 1, dataColagem: null, servico: null },
    ]);

    expect(componente.pecas.length).toBe(1);
  });

  it('selecionar todas marca/desmarca todas as pecas buscadas', () => {
    const componente = criar();
    componente.idPeriodo = 10;
    componente.buscarPecas();
    httpMock.expectOne(`${base}/pecas-elegiveis`).flush([
      { pecaId: 1, codigo: 'PC-1' } as never,
      { pecaId: 2, codigo: 'PC-2' } as never,
    ]);

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
    httpMock.expectNone(base);
  });

  it('gerar OS cria a ordem e abre o modal de entrega com o contexto certo', () => {
    const componente = criar();
    componente.idPeriodo = 10;
    componente.selecionadas.add(1);

    componente.gerarOs();

    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.idPeriodo).toBe(10);
    expect(req.request.body.idsPeca).toEqual([1]);
    req.flush({ id: 99, numero: 42, periodoNome: 'Bissemana 16, 2026', pecasCount: 1 });

    expect(componente.modalAberto).toBe(true);
    expect(componente.contextoEntrega).toEqual({ id: 99, numero: 42, pecasCount: 1, periodoNome: 'Bissemana 16, 2026' });
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
    httpMock.expectOne(base).flush({ id: 99, numero: 42, periodoNome: 'Bissemana 16, 2026', pecasCount: 1 });

    componente.fecharModalEIrParaDetalhe();

    expect(navegar).toHaveBeenCalledWith(['/ordens-servico', 99]);
  });
});
