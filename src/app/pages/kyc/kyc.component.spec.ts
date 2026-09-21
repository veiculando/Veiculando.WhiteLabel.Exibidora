import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { KycComponent } from './kyc.component';

describe('KycComponent — VEI-RD-80', () => {
  const base = `${environment.bffUrl}/kyc/analises`;

  const pendente = {
    Id: 10,
    Tipo: 0,
    Estado: 1,
    DataEnvio: '2026-08-10T09:12:00',
    AnalistaId: null,
    AnalistaNome: null,
    Nome: null,
    RazaoSocial: null,
    Cnpj: null,
    Responsavel: { Nome: 'Sérgio Ramos', Cpf: '12345678900', Email: 's@x.com' },
  };

  const aprovado = {
    ...pendente,
    Id: 11,
    Estado: 4,
    AnalistaId: 3,
    AnalistaNome: 'Rafael Andrade',
    Nome: 'Nova Onda Ag.',
    RazaoSocial: 'Nova Onda Publicidade e Propaganda Ltda',
    Cnpj: '98765432000110',
  };

  const resumo = {
    PendenteVerificacao: 4,
    EmAnalise: 2,
    AjustesSolicitados: 1,
    Aprovado: 7,
    Rejeitado: 0,
  };

  function pagina(itens: unknown[]) {
    return { Itens: itens, Page: 1, PageSize: 25, Total: itens.length, TotalPaginas: 1 };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KycComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function montar(itens: unknown[] = [pendente, aprovado]) {
    const fixture = TestBed.createComponent(KycComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url === base).flush(pagina(itens));
    http.expectOne((r) => r.url === `${base}/resumo`).flush(resumo);
    fixture.detectChanges();
    return { fixture, http, texto: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
  }

  it('mostra exatamente cinco chips de estado', () => {
    // Rascunho é estado do solicitante (ainda não enviou) e Suspenso é ação
    // pós-aprovação — nenhum dos dois é item de triagem.
    const { fixture } = montar();
    const chips = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.kyc__chip'))
      .map((c) => c.textContent?.trim() ?? '');

    expect(chips.length).toBe(5);
    expect(chips[0]).toContain('Pendente');
    expect(chips[1]).toContain('Em análise');
    expect(chips[2]).toContain('Ajustes solicitados');
    expect(chips[3]).toContain('Aprovado');
    expect(chips[4]).toContain('Rejeitado');
  });

  it('não oferece Rascunho nem Suspenso como filtro da fila', () => {
    const { fixture } = montar();
    const chips = (Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.kyc__chip'))
      .map((c) => c.textContent ?? '')).join(' ');
    expect(chips).not.toContain('Rascunho');
    expect(chips).not.toContain('Suspenso');
  });

  it('os chips mostram a contagem que veio do resumo', () => {
    const { texto } = montar();
    expect(texto()).toContain('Pendente (4)');
    expect(texto()).toContain('Aprovado (7)');
    // Estado zerado continua visível: um chip que some muda a régua a cada filtro.
    expect(texto()).toContain('Rejeitado (0)');
  });

  it('as colunas seguem o frame 154:4927', () => {
    const { fixture } = montar();
    const cabecalhos = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('th'))
      .map((th) => th.textContent?.trim());
    expect(cabecalhos).toEqual([
      'Tipo', 'Nome / Razão social', 'CNPJ', 'Responsável legal',
      'Envio', 'Status', 'Analista', 'Ações',
    ]);
  });

  it('a coluna Envio traz data E hora', () => {
    const { texto } = montar();
    expect(texto()).toContain('10/08/2026 09:12');
  });

  it('analista vazio renderiza travessão, não string vazia', () => {
    const { fixture } = montar([pendente]);
    const celulas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody td'));
    expect(celulas[6].textContent?.trim()).toBe('—');
  });

  it('quando a organização já existe, mostra nome fantasia e razão social', () => {
    const { texto } = montar([aprovado]);
    expect(texto()).toContain('Nova Onda Ag.');
    expect(texto()).toContain('Nova Onda Publicidade e Propaganda Ltda');
  });

  it('quando ainda não há organização, diz que os dados virão depois em vez de mentir um vazio', () => {
    // Lacuna de modelo de VEI-RD-78 exposta honestamente na tela.
    const { texto } = montar([pendente]);
    expect(texto()).toContain('Dados da empresa disponíveis após a aprovação');
  });

  it('o subtítulo é próprio da tela, não a copy herdada de Anunciantes', () => {
    // O Figma repete aqui "Gestão das marcas anunciantes e associação às agências",
    // que é a copy de Anunciantes e de Prospecção. Esta tela tria onboarding.
    const { texto } = montar();
    expect(texto()).not.toContain('Gestão das marcas anunciantes');
    expect(texto()).toContain('Triagem dos pedidos de onboarding');
  });

  it('assumir chama o endpoint e recarrega fila e resumo', () => {
    const { fixture, http } = montar([pendente]);
    const botao = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Assumir')!;
    botao.click();

    http.expectOne(`${base}/10/assumir`).flush({});
    http.expectOne((r) => r.url === base).flush(pagina([pendente]));
    http.expectOne((r) => r.url === `${base}/resumo`).flush(resumo);
    fixture.detectChanges();
  });

  it('conflito ao assumir mostra a recusa do servidor', async () => {
    const { fixture, http, texto } = montar([pendente]);
    const botao = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Assumir')!;
    botao.click();

    http.expectOne(`${base}/10/assumir`).flush(
      { message: 'Esta análise já foi assumida por outro operador.' },
      { status: 409, statusText: 'Conflict' }
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto()).toContain('já foi assumida por outro operador');
  });

  it('análise já assumida não oferece o botão de assumir', () => {
    const { fixture } = montar([aprovado]);
    const botoes = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .map((b) => b.textContent?.trim());
    expect(botoes).not.toContain('Assumir');
  });

  it('o chip selecionado filtra a fila pelo estado, e o resumo NÃO recebe esse filtro', () => {
    const { fixture, http } = montar();
    const chip = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.kyc__chip'))
      .find((c) => c.textContent?.includes('Aprovado'))! as HTMLButtonElement;
    chip.click();

    http.expectOne((r) => r.url === base && r.params.get('estado') === 'Aprovado').flush(pagina([aprovado]));
    // O resumo é o eixo da contagem: filtrá-lo por estado zeraria os outros chips.
    http.expectOne((r) => r.url === `${base}/resumo` && r.params.get('estado') === null).flush(resumo);
    fixture.detectChanges();
  });

  it('a busca e o filtro de data vão para os DOIS endpoints', () => {
    // O resumo tem de refletir o mesmo conjunto filtrado da listagem; senão o chip
    // diz 12 e a lista mostra 3, e o operador não sabe qual é o número dele.
    const fixture = TestBed.createComponent(KycComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.componentInstance.busca = 'Nova Onda';
    fixture.componentInstance.dataEnvio = '2026-08-10';
    fixture.detectChanges();

    http.expectOne((r) => r.url === base && r.params.get('busca') === 'Nova Onda' && r.params.get('dataEnvio') === '2026-08-10')
      .flush(pagina([aprovado]));
    http.expectOne((r) => r.url === `${base}/resumo` && r.params.get('busca') === 'Nova Onda' && r.params.get('dataEnvio') === '2026-08-10')
      .flush(resumo);
    fixture.detectChanges();
  });
});
