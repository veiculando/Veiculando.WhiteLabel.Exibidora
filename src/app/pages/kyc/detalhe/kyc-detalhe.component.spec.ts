import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { KycDetalheComponent } from './kyc-detalhe.component';

describe('KycDetalheComponent — VEI-RD-81', () => {
  const base = `${environment.bffUrl}/kyc/analises/10`;

  const detalhe = {
    Id: 10,
    Tipo: 0,
    Estado: 2,
    DataEnvio: '2026-08-10T09:12:00',
    DataDecisao: null,
    IdOrganizacao: null,
    AnalistaId: 3,
    AnalistaNome: 'Rafael Andrade',
    ResponsavelLegal: {
      Nome: 'Sérgio Ramos',
      Cpf: '12345678900',
      Cargo: 'Diretor',
      Email: 'sergio@impar.com.br',
      Celular: '12999998888',
      DeclaracaoPoderes: 'Contrato social cláusula 7',
    },
    Documentos: [{ Id: 55, Tipo: 0, Status: 0, MotivoPendencia: null }],
    UsuariosEConvites: [],
    Historico: [
      { Id: 1, Estado: 2, Justificativa: 'Assumido para análise', CamposPendentesJson: null, DataHora: '2026-08-10T10:00:00', Usuario: 'Rafael Andrade' },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KycDetalheComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '10' }) } } },
      ],
    }).compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function montar(dados = detalhe) {
    const fixture = TestBed.createComponent(KycDetalheComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(base).flush(dados);
    fixture.detectChanges();
    return { fixture, http, texto: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
  }

  function abas(fixture: { nativeElement: unknown }): HTMLButtonElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]'));
  }

  it('tem exatamente sete abas', () => {
    const { fixture } = montar();
    expect(abas(fixture).length).toBe(7);
  });

  it('a aba de representação muda de nome conforme o tipo da organização', () => {
    // Uma Agência tem anunciantes vinculados; um Anunciante tem agências.
    const { fixture } = montar();
    expect(abas(fixture).map((a) => a.textContent?.trim())).toContain('Anunciantes vinculados');

    const outra = TestBed.createComponent(KycDetalheComponent);
    const http = TestBed.inject(HttpTestingController);
    outra.detectChanges();
    http.expectOne(base).flush({ ...detalhe, Tipo: 1 });
    outra.detectChanges();
    expect(abas(outra).map((a) => a.textContent?.trim())).toContain('Agências e representação');
  });

  it('a aba de responsável legal mostra os campos do PRD', () => {
    const { fixture, texto } = montar();
    abas(fixture).find((a) => a.textContent?.trim() === 'Responsável legal')!.click();
    fixture.detectChanges();

    expect(texto()).toContain('Sérgio Ramos');
    expect(texto()).toContain('12345678900');
    expect(texto()).toContain('Diretor');
    expect(texto()).toContain('Contrato social cláusula 7');
  });

  it('a aba de condições comerciais avisa que não bloqueia o KYC', () => {
    // PRD §8.15: são pós-aprovação. Aprovar com elas em branco funciona.
    const { fixture, texto } = montar();
    abas(fixture).find((a) => a.textContent?.trim() === 'Condições comerciais')!.click();
    fixture.detectChanges();
    expect(texto()).toContain('não bloqueiam esta');
  });

  it('a aba de histórico mostra as decisões com autor', () => {
    const { fixture, texto } = montar();
    abas(fixture).find((a) => a.textContent?.trim() === 'Histórico')!.click();
    fixture.detectChanges();
    expect(texto()).toContain('Assumido para análise');
    expect(texto()).toContain('Rafael Andrade');
  });

  it('documento abre por URL temporária pedida no clique, nunca por link permanente', () => {
    const { fixture, http } = montar();
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);

    abas(fixture).find((a) => a.textContent?.trim() === 'Documentos')!.click();
    fixture.detectChanges();

    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Visualizar')!
      .click();

    http.expectOne(`${environment.bffUrl}/kyc/documentos/55/url`).flush({
      Url: '/api/wl/kyc/documentos/55/conteudo?token=abc',
      ExpiraEm: '2026-08-10T09:17:00Z',
      TtlSegundos: 300,
    });
    fixture.detectChanges();

    expect(abrir).toHaveBeenCalled();
  });

  it('aprovar exige justificativa antes de habilitar o envio', () => {
    const { fixture } = montar();
    fixture.componentInstance.abrirDecisao('aprovar');
    fixture.detectChanges();
    expect(fixture.componentInstance.podeEnviar()).toBe(false);

    fixture.componentInstance.justificativa = 'Documentação conferida.';
    expect(fixture.componentInstance.podeEnviar()).toBe(true);
  });

  it('solicitar ajustes exige justificativa E ao menos um campo pendente', () => {
    // Os dois: um pedido de ajuste sem dizer o que ajustar devolve o solicitante
    // ao início sem informação.
    const { fixture } = montar();
    fixture.componentInstance.abrirDecisao('ajustes');
    fixture.componentInstance.justificativa = 'Faltam documentos.';
    expect(fixture.componentInstance.podeEnviar()).toBe(false);

    fixture.componentInstance.alternarPendencia('Contrato social', true);
    expect(fixture.componentInstance.podeEnviar()).toBe(true);
  });

  it('enviar ajustes manda os campos pendentes no corpo', () => {
    const { fixture, http } = montar();
    fixture.componentInstance.abrirDecisao('ajustes');
    fixture.componentInstance.justificativa = 'Faltam documentos.';
    fixture.componentInstance.alternarPendencia('Contrato social', true);
    fixture.componentInstance.enviarDecisao();

    const requisicao = http.expectOne(`${base}/ajustes`);
    expect(requisicao.request.body).toEqual({
      Justificativa: 'Faltam documentos.',
      CamposPendentes: ['Contrato social'],
    });
    requisicao.flush({});
    http.expectOne(base).flush(detalhe);
    fixture.detectChanges();
  });

  it('suspender só aparece para organização aprovada', () => {
    // Estado 2 (EmAnalise): a ação não se aplica, então some do DOM.
    const { texto } = montar();
    expect(texto()).not.toContain('Suspender');
  });

  it('organização aprovada oferece suspender, e suspensa oferece reativar', () => {
    const aprovada = montar({ ...detalhe, Estado: 4 });
    expect(aprovada.texto()).toContain('Suspender');
    expect(aprovada.texto()).not.toContain('Reativar');

    const outra = TestBed.createComponent(KycDetalheComponent);
    const http = TestBed.inject(HttpTestingController);
    outra.detectChanges();
    http.expectOne(base).flush({ ...detalhe, Estado: 6 });
    outra.detectChanges();
    const texto = (outra.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Reativar');
  });

  it('reativar é a única decisão que não exige justificativa', () => {
    // É o desfazer de uma suspensão já justificada, não uma decisão nova.
    const { fixture } = montar({ ...detalhe, Estado: 6 });
    fixture.componentInstance.abrirDecisao('reativar');
    expect(fixture.componentInstance.podeEnviar()).toBe(true);
  });

  it('quando ainda não há organização, a aba de empresa explica a lacuna', () => {
    const { texto } = montar();
    expect(texto()).toContain('ainda não estão disponíveis');
  });

  it('recusa do servidor na decisão aparece para o operador', async () => {
    const { fixture, http, texto } = montar();
    fixture.componentInstance.abrirDecisao('aprovar');
    fixture.componentInstance.justificativa = 'ok';
    fixture.componentInstance.enviarDecisao();

    http.expectOne(`${base}/aprovar`).flush(
      { message: 'A organização ainda não foi criada no Core — não há o que vincular.' },
      { status: 409, statusText: 'Conflict' }
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto()).toContain('não há o que vincular');
  });
});
