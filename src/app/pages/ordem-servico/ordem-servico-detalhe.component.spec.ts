import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { OrdemServicoDetalheComponent } from './ordem-servico-detalhe.component';
import { environment } from '../../../environments/environment';

/**
 * OS — detalhe (VEI-RD-88d, Figma `198:546`).
 *
 * Regras duras, mesma decisão humana de VEI-RD-88c (2026-09-17): sem bloco
 * RESPONSÁVEL (COLADOR), sem botão REATRIBUIR COLADOR, sem o contador "N de
 * M peças confirmadas na tela de Colagem" — nenhuma tela de Colagem existe
 * nesta sprint.
 */
describe('OrdemServicoDetalheComponent', () => {
  let httpMock: HttpTestingController;
  const base = `${environment.bffUrl}/ordens-servico`;

  function configurar(id = '42') {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  function detalhePadrao() {
    return {
      id: 42,
      numero: 42,
      status: 'Aberta',
      periodoNome: 'Bissemana 16 — 2026',
      cidades: ['Bertioga', 'São Sebastião'],
      criadaEm: '2026-08-10T09:20:00',
      criadaPor: 'Operador X',
      pecasCount: 3,
      pecas: [
        { codigo: 'PC-1', endereco: 'Rua A', bairro: 'Centro', campanhaAtual: 'Campanha X', dataColagem: null, statusColagem: 'Pendente' },
      ],
      historico: [{ evento: 'OS gerada com 3 peças selecionadas', timestamp: '10/08/2026 09:20', autor: 'Operador X' }],
    };
  }

  it('nunca renderiza RESPONSAVEL (COLADOR) nem REATRIBUIR COLADOR', () => {
    configurar();
    const fixture = TestBed.createComponent(OrdemServicoDetalheComponent);
    // Um unico detectChanges() dispara o ngOnInit — nunca chamar ngOnInit()
    // manualmente E TAMBEM detectChanges(): dispararia a requisicao em dobro.
    fixture.detectChanges();
    httpMock.expectOne(`${base}/42`).flush(detalhePadrao());

    fixture.detectChanges();

    const texto = ((fixture.nativeElement as HTMLElement).textContent ?? '').toUpperCase();
    expect(texto).not.toContain('RESPONSÁVEL (COLADOR)');
    expect(texto).not.toContain('REATRIBUIR');
    expect(texto).not.toContain('COLADOR');
  });

  it('nunca renderiza o contador "N de M pecas confirmadas na tela de Colagem"', () => {
    configurar();
    const fixture = TestBed.createComponent(OrdemServicoDetalheComponent);
    // Um unico detectChanges() dispara o ngOnInit — nunca chamar ngOnInit()
    // manualmente E TAMBEM detectChanges(): dispararia a requisicao em dobro.
    fixture.detectChanges();
    httpMock.expectOne(`${base}/42`).flush(detalhePadrao());

    fixture.detectChanges();

    // "Colagem" sozinho NAO e proibido: os cabecalhos "Data Colagem"/"Status
    // Colagem" sao colunas exigidas pelo card. O que nao pode existir e o
    // CONTADOR "N de M pecas confirmadas" — ele so teria origem numa tela de
    // Colagem que nao existe nesta sprint.
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('confirmadas');
    expect(texto).not.toMatch(/\d+\s*de\s*\d+\s*peças/i);
  });

  it('data colagem e status colagem sao sempre "—"/"Pendente"', () => {
    configurar();
    const fixture = TestBed.createComponent(OrdemServicoDetalheComponent);
    // Um unico detectChanges() dispara o ngOnInit — nunca chamar ngOnInit()
    // manualmente E TAMBEM detectChanges(): dispararia a requisicao em dobro.
    fixture.detectChanges();
    httpMock.expectOne(`${base}/42`).flush(detalhePadrao());

    fixture.detectChanges();

    const linhas = (fixture.nativeElement as HTMLElement).querySelectorAll('td');
    const textos = Array.from(linhas).map((td) => td.textContent?.trim());
    expect(textos).toContain('Pendente');
  });

  it('info card mostra STATUS, PEÇAS NA OS e CRIADA POR', () => {
    configurar();
    const fixture = TestBed.createComponent(OrdemServicoDetalheComponent);
    // Um unico detectChanges() dispara o ngOnInit — nunca chamar ngOnInit()
    // manualmente E TAMBEM detectChanges(): dispararia a requisicao em dobro.
    fixture.detectChanges();
    httpMock.expectOne(`${base}/42`).flush(detalhePadrao());

    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Peças na OS');
    expect(texto).toContain('Criada por');
    expect(texto).toContain('Operador X');
  });

  it('baixa a planilha como blob, sem navegar para pagina quebrada em caso de erro', () => {
    configurar();
    const fixture = TestBed.createComponent(OrdemServicoDetalheComponent);
    // Um unico detectChanges() dispara o ngOnInit — nunca chamar ngOnInit()
    // manualmente E TAMBEM detectChanges(): dispararia a requisicao em dobro.
    fixture.detectChanges();
    httpMock.expectOne(`${base}/42`).flush(detalhePadrao());
    fixture.detectChanges();

    fixture.componentInstance.baixarPlanilha();
    httpMock.expectOne(`${base}/42/planilha-pdf`).flush(null, { status: 502, statusText: 'Bad Gateway' });

    expect(fixture.componentInstance.erroPlanilha).toBeTruthy();
    expect(fixture.componentInstance.baixando).toBe(false);
  });
});
