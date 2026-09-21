import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ProspeccaoComponent } from './prospeccao.component';

describe('ProspeccaoComponent — VEI-RD-83', () => {
  const base = `${environment.bffUrl}/prospeccao/sessao`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProspeccaoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function montar() {
    const fixture = TestBed.createComponent(ProspeccaoComponent);
    fixture.detectChanges();
    return { fixture, texto: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
  }

  it('usa a copy literal do Figma nos três itens de "Como funciona"', () => {
    const { texto } = montar();
    expect(texto()).toContain('Token temporário');
    expect(texto()).toContain('Entra automaticamente, sem senha.');
    expect(texto()).toContain('Identificação');
    expect(texto()).toContain('Vinculado ao operador para rastrear a origem do pedido.');
    expect(texto()).toContain('Expira automaticamente');
    expect(texto()).toContain('O acesso encerra depois de um tempo.');
  });

  it('não expõe jargão técnico na interface', () => {
    // O protótipo mostrava FonteAgenciaId, "BFF" e "TTL" na tela; o Figma trocou por
    // linguagem de usuário. O comportamento técnico é o mesmo — só não aparece.
    const { texto } = montar();
    expect(texto()).not.toContain('FonteAgenciaId');
    expect(texto()).not.toContain('BFF');
    expect(texto()).not.toContain('TTL');
  });

  it('o subtítulo é próprio, não a copy herdada de Anunciantes', () => {
    const { texto } = montar();
    expect(texto()).not.toContain('Gestão das marcas anunciantes');
  });

  it('tem o botão "Iniciar Prospecção"', () => {
    const { texto } = montar();
    expect(texto()).toContain('Iniciar Prospecção');
  });

  it('iniciar chama POST /prospeccao/sessao', () => {
    const { fixture } = montar();
    const http = TestBed.inject(HttpTestingController);
    vi.spyOn(window, 'open').mockReturnValue(null);

    const botao = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Iniciar Prospecção')!;
    botao.click();

    const requisicao = http.expectOne(base);
    expect(requisicao.request.method).toBe('POST');
    requisicao.flush({
      AppUrl: 'https://app.exemplo.com.br/prospeccao',
      Token: 'tok.en',
      ExpiraEm: '2026-08-10T09:14:00Z',
      TtlSegundos: 120,
      FonteOrigem: 'WhiteLabel',
      FonteAgenciaId: 7,
      FonteUsuarioId: 42,
    });
    fixture.detectChanges();
  });

  it('o token não vai na URL da nova aba', () => {
    // Token em query string entra no histórico do navegador, no Referer da próxima
    // requisição e no log de qualquer proxy no caminho.
    const { fixture } = montar();
    const http = TestBed.inject(HttpTestingController);
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);

    const botao = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Iniciar Prospecção')!;
    botao.click();

    http.expectOne(base).flush({
      AppUrl: 'https://app.exemplo.com.br/prospeccao',
      Token: 'tok.en',
      ExpiraEm: '2026-08-10T09:14:00Z',
      TtlSegundos: 120,
      FonteOrigem: 'WhiteLabel',
      FonteAgenciaId: 7,
      FonteUsuarioId: 42,
    });
    fixture.detectChanges();

    const urlAberta = abrir.mock.calls[0]?.[0] ?? '';
    expect(String(urlAberta)).not.toContain('tok.en');
    expect(String(urlAberta)).not.toContain('token=');
  });

  it('erro do servidor aparece para o operador', () => {
    const { fixture } = montar();
    const http = TestBed.inject(HttpTestingController);
    vi.spyOn(window, 'open').mockReturnValue(null);

    const botao = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Iniciar Prospecção')!;
    botao.click();

    http.expectOne(base).flush(
      { message: 'A URL do App WL não está configurada para esta exibidora.' },
      { status: 503, statusText: 'Service Unavailable' }
    );
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('não está configurada');
  });
});
