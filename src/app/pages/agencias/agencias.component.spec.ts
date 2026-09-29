import { PermissionService } from '../../core/auth/permission.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AgenciasComponent } from './agencias.component';
import { agenciaPorCnpjReal, agenciasListaReal } from '../../../testing/contratos/contratos';

describe('AgenciasComponent — VEI-RD-79', () => {
  const base = `${environment.bffUrl}/agencias`;

  const impar = {
    id: 1,
    nome: 'Ímpar Propaganda',
    razaoSocial: 'Ímpar Propaganda e Mídia Ltda',
    cnpj: '12345678000190',
    cidade: 'São José dos Campos',
    uf: 'SP',
    email: 'contato@impar.com.br',
    telefone: '(12) 3622-1000',
    status: 1 as const,
    campanhas: 14,
  };

  const inativa = { ...impar, id: 2, nome: 'Agência Parada', status: 0 as const, campanhas: 0 };

  function pagina(itens: unknown[]) {
    return { itens: itens, page: 1, pageSize: 25, total: itens.length, totalPaginas: 1 };
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AgenciasComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: PermissionService, useValue: { getAfiliadaId: () => '4821' } }],
    }).compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function montar(itens: unknown[] = [impar]) {
    const fixture = TestBed.createComponent(AgenciasComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url === base).flush(pagina(itens));
    fixture.detectChanges();
    return { fixture, http, texto: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
  }

  it('mostra nome fantasia e razão social na coluna Agência / Empresa', () => {
    const { texto } = montar();
    expect(texto()).toContain('Ímpar Propaganda');
    expect(texto()).toContain('Ímpar Propaganda e Mídia Ltda');
  });

  it('agrega CNPJ, cidade/UF, e-mail e telefone num bloco de contato', () => {
    // O Figma consolidou o contato numa coluna só — não quatro colunas separadas.
    const { texto } = montar();
    expect(texto()).toContain('12345678000190');
    expect(texto()).toContain('São José dos Campos/SP');
    expect(texto()).toContain('contato@impar.com.br');
    expect(texto()).toContain('(12) 3622-1000');
  });

  it('mostra a contagem de campanhas que veio do servidor', () => {
    const { texto } = montar();
    expect(texto()).toContain('14 campanhas');
  });

  it('não tem coluna de status de KYC — o KYC tem tela própria', () => {
    const { fixture } = montar();
    const cabecalhos = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('th')
    ).map((th) => th.textContent?.trim());
    expect(cabecalhos).toEqual([
      'Agência / Empresa',
      'Informações de contato',
      'Status',
      'Campanhas',
      'Ações',
    ]);
  });

  it('renderiza o status como badge com texto, nunca só cor', () => {
    const { texto } = montar();
    expect(texto()).toContain('Ativo');
  });

  it('a ação de remover é rotulada como inativação, não como exclusão', () => {
    // O Figma desenha uma lixeira; o PRD §8.5 manda inativar o vínculo e manter a
    // Agencia no Core. O rótulo precisa dizer o que o sistema faz.
    const { texto, fixture } = montar();
    expect(texto()).toContain('Inativar');
    expect(texto()).not.toContain('Excluir');

    const botoes = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .map((b) => b.textContent?.trim());
    expect(botoes).not.toContain('Excluir');
  });

  it('agência inativa oferece reativar — a inativação é reversível', () => {
    const { texto } = montar([inativa]);
    expect(texto()).toContain('Reativar');
  });

  it('inativar chama PATCH /status com Ativo=false e não um DELETE', () => {
    const { fixture, http } = montar();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const botao = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Inativar')!;
    botao.click();

    const requisicao = http.expectOne(`${base}/1/status`);
    expect(requisicao.request.method).toBe('PATCH');
    expect(requisicao.request.body).toEqual({ ativo: false });
    requisicao.flush({});

    http.expectOne((r) => r.url === base).flush(pagina([inativa]));
    fixture.detectChanges();
  });

  it('as abas de status filtram a listagem no servidor', async () => {
    const { fixture, http } = montar();
    const aba = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]'))
      .find((b) => b.textContent?.trim() === 'Inativo')! as HTMLButtonElement;
    aba.click();

    const requisicao = http.expectOne((r) => r.url === base && r.params.get('status') === 'Inativo');
    requisicao.flush(pagina([inativa]));
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Agência Parada');
  });

  it('recusa da API ao inativar a venda direta aparece para o operador', () => {
    const { fixture, http } = montar();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const botao = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Inativar')!;
    botao.click();

    http.expectOne(`${base}/1/status`).flush(
      { message: 'A agência de venda direta não pode ser inativada: ela representa as vendas feitas sem agência.' },
      { status: 409, statusText: 'Conflict' }
    );
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('venda direta não pode ser inativada');
  });

  it('o formulário exige consulta de CNPJ antes de abrir', () => {
    const { fixture, texto } = montar();
    const novo = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Nova agência')!;
    novo.click();
    fixture.detectChanges();

    expect(texto()).toContain('Consultar CNPJ');
    // Nenhum campo de cadastro aparece antes da consulta.
    expect(texto()).not.toContain('Razão social');
  });

  it('CNPJ já existente propõe vínculo em vez de um segundo cadastro', () => {
    const { fixture, http, texto } = montar();
    fixture.componentInstance.formAberto = true;
    fixture.componentInstance.cnpjConsulta = '12345678000190';
    fixture.componentInstance.consultarCnpj();

    http.expectOne(`${base}/por-cnpj/12345678000190`).flush({
      id: 9,
      nome: 'Ímpar Propaganda',
      razaoSocial: 'Ímpar Propaganda e Mídia Ltda',
      cnpj: '12345678000190',
      jaVinculadaAEstaAfiliada: false,
      propostaDeVinculo: true,
    });
    fixture.detectChanges();

    expect(texto()).toContain('Vincular agência existente');
    expect(fixture.componentInstance.form).toBeNull();
  });

  it('CNPJ inédito libera o formulário de cadastro', () => {
    const { fixture, http, texto } = montar();
    fixture.componentInstance.formAberto = true;
    fixture.componentInstance.cnpjConsulta = '99999999000199';
    fixture.componentInstance.consultarCnpj();

    http.expectOne(`${base}/por-cnpj/99999999000199`).flush(
      { message: 'Nenhuma agência com este CNPJ.' },
      { status: 404, statusText: 'Not Found' }
    );
    fixture.detectChanges();

    expect(texto()).toContain('Razão social');
    expect(fixture.componentInstance.form?.cnpj).toBe('99999999000199');
  });

  it('o formulário não tem campo de prazo de pagamento', () => {
    // PRD §5.5: o campo não existe em AgenciaCadastroCommand nem na entidade Agencia.
    // Um campo aqui não teria onde ser gravado.
    const { fixture, http } = montar();
    fixture.componentInstance.formAberto = true;
    fixture.componentInstance.cnpjConsulta = '99999999000199';
    fixture.componentInstance.consultarCnpj();
    http.expectOne(`${base}/por-cnpj/99999999000199`).flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto.toLowerCase()).not.toContain('prazo de pagamento');
    expect(Object.keys(fixture.componentInstance.form!)).not.toContain('PrazoPagamento');
  });

  it('o formulário não deixa escolher a afiliada — ela é implícita', () => {
    const { fixture, http } = montar();
    fixture.componentInstance.formAberto = true;
    fixture.componentInstance.cnpjConsulta = '99999999000199';
    fixture.componentInstance.consultarCnpj();
    http.expectOne(`${base}/por-cnpj/99999999000199`).flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    // A checagem e do FORMULARIO, nao da pagina: o subtitulo do cabecalho diz
    // "vinculadas a exibidora", o que e descricao, nao escolha. O que nao pode
    // existir e um campo para escolher a afiliada.
    const formulario = (fixture.nativeElement as HTMLElement).querySelector('.agencias__form')!;
    const texto = (formulario.textContent ?? '').toLowerCase();
    expect(texto).not.toContain('exibidora');
    expect(texto).not.toContain('afiliada');
    expect(Object.keys(fixture.componentInstance.form!)).not.toContain('IdAfiliada');
  });

  describe('com a resposta real do BFF (src/testing/contratos)', () => {
    async function montarReal() {
      const fixture = TestBed.createComponent(AgenciasComponent);
      const http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      http.expectOne((r) => r.url === base).flush(agenciasListaReal());
      fixture.detectChanges();
      await fixture.whenStable();
      return { fixture, http, texto: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
    }

    it('sai de "Carregando…" e lista as agências do preview', async () => {
      const { texto } = await montarReal();
      expect(texto()).not.toContain('Carregando agências');
      expect(texto()).toContain('Agencia Horizonte');
      expect(texto()).toContain('Horizonte Comunicacao e Midia Ltda');
      expect(texto()).toContain('5 cadastradas');
      expect(texto()).toContain('1 campanhas');
    });

    it('rotula o vínculo inativo que veio do servidor', async () => {
      const { texto } = await montarReal();
      expect(texto()).toContain('Inativo');
      expect(texto()).toContain('Reativar');
    });

    it('a consulta de CNPJ real reconhece a agência já vinculada', async () => {
      const { fixture, http } = await montarReal();
      fixture.componentInstance.abrirConsultaCnpj();
      fixture.componentInstance.cnpjConsulta = '11111111000191';
      fixture.componentInstance.consultarCnpj();
      http.expectOne(`${base}/por-cnpj/11111111000191`).flush(agenciaPorCnpjReal());
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.componentInstance.consultaMensagem).toBe('Agencia Horizonte já está vinculada a esta exibidora.');
    });
  });
});
