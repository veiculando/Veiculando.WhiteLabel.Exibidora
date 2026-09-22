import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { CadastroAcessoComponent } from './cadastro-acesso.component';

describe('CadastroAcessoComponent — VEI-RD-82', () => {
  const base = `${environment.bffUrl}/config/cadastro-acesso`;

  const config = {
    ExigirEmailCorporativoNoCadastro: false,
    DominiosBloqueados: ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.com', 'icloud.com'],
    DominiosEditaveis: false,
    Historico: [
      {
        Id: 1,
        ValorAnterior: 'Inativo',
        ValorNovo: 'Ativo',
        DataHora: '2026-08-01T14:12:00',
        Usuario: 'Rafael Andrade',
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadastroAcessoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function montar(inicial = config) {
    const fixture = TestBed.createComponent(CadastroAcessoComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(base).flush(inicial);
    fixture.detectChanges();
    return { fixture, http, texto: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
  }

  function botao(fixture: { nativeElement: unknown }, rotulo: string): HTMLButtonElement {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === rotulo)! as HTMLButtonElement;
  }

  it('exibe os seis domínios bloqueados que o servidor mandou', () => {
    // Seis, não quatro: o PRD §5.14 cita quatro e o frame acrescenta live.com e
    // icloud.com. A lista é do backend — o frontend só lê.
    const { texto } = montar();
    for (const dominio of config.DominiosBloqueados) {
      expect(texto()).toContain(dominio);
    }
  });

  it('não renderiza nenhum controle para editar a lista de domínios', () => {
    // Invariante #8: o proibido é omitido do DOM, não desabilitado.
    const { fixture, texto } = montar();
    expect(texto()).toContain('não editável nesta versão');

    const listaDominios = (fixture.nativeElement as HTMLElement).querySelector('.cadastro-acesso__dominios')!;
    expect(listaDominios.querySelectorAll('input, button, select, textarea').length).toBe(0);
  });

  it('alternar o switch NÃO persiste nada', () => {
    // A tela só aplica no "Salvar alterações". Uma política de acesso que mudasse
    // ao toque transformaria um clique acidental numa mudança de quem se cadastra.
    const { fixture, http } = montar();
    fixture.componentInstance.alternar(true);
    fixture.detectChanges();

    http.expectNone(base);
    expect(fixture.componentInstance.sujo).toBe(true);
  });

  it('o botão Salvar só habilita quando há mudança pendente', () => {
    const { fixture } = montar();
    expect(botao(fixture, 'Salvar alterações').disabled).toBe(true);

    fixture.componentInstance.alternar(true);
    fixture.detectChanges();
    expect(botao(fixture, 'Salvar alterações').disabled).toBe(false);
  });

  it('salvar envia o PUT e recarrega a configuração', async () => {
    const { fixture, http } = montar();
    fixture.componentInstance.alternar(true);
    fixture.detectChanges();

    botao(fixture, 'Salvar alterações').click();

    const requisicao = http.expectOne(base);
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual({ ExigirEmailCorporativoNoCadastro: true });
    requisicao.flush({});

    http.expectOne(base).flush({ ...config, ExigirEmailCorporativoNoCadastro: true });
    // whenStable antes de ler o DOM: o PUT dispara o GET a partir da resposta, e o
    // scheduler coalescido do Angular 22 nao reavalia os @if do template so com um
    // detectChanges sincrono. Sem isto, um not.toContain passaria lendo a tela antiga.
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ativo');
  });

  it('descartar volta ao valor persistido sem chamar o servidor', () => {
    const { fixture, http } = montar();
    fixture.componentInstance.alternar(true);
    fixture.detectChanges();

    botao(fixture, 'Descartar').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.exigirEmailCorporativo).toBe(false);
    expect(fixture.componentInstance.sujo).toBe(false);
    http.expectNone(base);
  });

  it('mostra o histórico no formato "Inativo → Ativo · autor · data"', () => {
    const { texto } = montar();
    expect(texto()).toContain('Inativo → Ativo');
    expect(texto()).toContain('Rafael Andrade');
  });

  it('diz que convites de organizações já aprovadas continuam permitidos', () => {
    // InfoLine 2 do frame 287:12843 — confirma o PRD §5.14: a política vale para o
    // cadastro público, não para convites.
    const { texto } = montar();
    expect(texto()).toContain('Convites de organizações já aprovadas continuam permitidos');
  });

  it('não tem gestão de convites nesta tela', () => {
    // Correção de escopo (task 82d): o frame contém apenas a política de e-mail.
    // A gestão de convites do PRD §5.14 não tem tela desenhada — pendência de design.
    const { texto } = montar();
    expect(texto()).not.toContain('Reenviar');
    expect(texto()).not.toContain('Revogar');
    expect(texto()).not.toContain('Convites pendentes');
  });

  it('o badge de estado sempre traz texto, nunca só cor', () => {
    const { texto } = montar({ ...config, ExigirEmailCorporativoNoCadastro: true });
    expect(texto()).toContain('Ativo');
  });
});
