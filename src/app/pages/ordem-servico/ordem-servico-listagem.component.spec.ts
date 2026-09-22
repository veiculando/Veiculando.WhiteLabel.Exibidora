import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { OrdemServicoListagemComponent } from './ordem-servico-listagem.component';
import { environment } from '../../../environments/environment';

/**
 * OS — listagem (VEI-RD-88a, Figma `198:2`). Sem controller no BFF ainda;
 * fixa o contrato esperado (`GET /api/wl/ordens-servico`).
 */
describe('OrdemServicoListagemComponent', () => {
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
    const fixture = TestBed.createComponent(OrdemServicoListagemComponent);
    // Um unico detectChanges() dispara o ngOnInit — nunca chamar ngOnInit()
    // manualmente E TAMBEM detectChanges(): dispararia a requisicao em dobro.
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === `${environment.bffUrl}/lookups/periodos`).flush([]);
    httpMock.expectOne((r) => r.url === `${environment.bffUrl}/lookups/cidades`).flush([]);
    httpMock.expectOne((r) => r.url === base).flush({
      itens: [
        {
          id: 1,
          numero: 42,
          periodoNome: 'Bissemana 16 — 2026',
          cidades: ['Bertioga', 'São Sebastião'],
          responsavelNome: null,
          responsavelAvatarUrl: null,
          pecasCount: 3,
          status: 'Aberta',
          criadaEm: '2026-08-10T09:20:00',
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPaginas: 1,
    });

    return fixture;
  }

  it('formata "OS Nº" com zero-padding: OS #0042', () => {
    const fixture = criar();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('OS #0042');
  });

  it('cidades aparecem como lista separada por virgula', () => {
    const fixture = criar();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Bertioga, São Sebastião');
  });

  it('responsavel sem colador mostra "Nao atribuida", nunca um botao de atribuir', () => {
    const fixture = criar();
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Não atribuída');
    expect(texto).not.toContain('Atribuir');
  });

  it('nenhum link da listagem aponta para /atribuir ou /reatribuir', () => {
    const fixture = criar();
    fixture.detectChanges();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a[href]'));
    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(href.toLowerCase()).not.toContain('atribuir');
    }
  });

  it('botao "+ Nova Ordem de Servico" aponta para /ordens-servico/nova', () => {
    const fixture = criar();
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/ordens-servico/nova"]');
    expect(link?.textContent?.trim()).toContain('Nova Ordem de Serviço');
  });

  it('acao Entregar abre o modal com o contexto da OS', () => {
    const fixture = criar();
    fixture.componentInstance.abrirEntrega(fixture.componentInstance.ordens[0]);
    expect(fixture.componentInstance.modalAberto).toBe(true);
    expect(fixture.componentInstance.contextoEntrega?.numero).toBe(42);
  });
});
