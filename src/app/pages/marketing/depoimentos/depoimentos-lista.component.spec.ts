import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BrandingService } from '../../../core/branding/branding.service';
import { cmsDepoimentosListaReal, cmsDepoimentosResumoReal, cmsErroReal } from '../../../../testing/contratos/contratos';
import { DepoimentosListaComponent, assinatura, iniciais } from './depoimentos-lista.component';

/**
 * Card 3867cce1 (VEI-RD-8), lista `157:1270`. Uma única `autoDetectChanges()`;
 * `whenStable()` depois de cada `flush()`.
 */
describe('DepoimentosListaComponent — Figma 157:1270', () => {
  const URL = '/api/wl/cms/depoimentos';
  const RESUMO = `${URL}/resumo`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepoimentosListaComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: BrandingService, useValue: { branding: signal({ nomeExibicao: 'Exibidora Exemplo', cmsHabilitado: true }) } },
      ],
    }).compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function montar() {
    const fixture = TestBed.createComponent(DepoimentosListaComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.autoDetectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const responder = async (req: TestRequest, corpo: object | null, opcoes?: { status: number; statusText: string }) => {
      req.flush(corpo, opcoes);
      await fixture.whenStable();
    };
    const lista = () => http.expectOne((r) => r.url === URL);
    const resumo = () => http.expectOne(RESUMO);
    return { fixture, http, el, comp: fixture.componentInstance, responder, lista, resumo, texto: () => el.textContent ?? '' };
  }

  function kpi(el: HTMLElement, chave: string) {
    const card = el.querySelector(`[data-kpi="${chave}"]`);
    return { numero: card?.querySelector('.dp-kpi__numero')?.textContent?.trim(), texto: card?.textContent ?? '' };
  }

  it('os cinco KPIs mostram os valores do /resumo', async () => {
    const { el, responder, lista, resumo } = await montar();
    await responder(resumo(), cmsDepoimentosResumoReal());
    await responder(lista(), cmsDepoimentosListaReal());

    expect(kpi(el, 'total')).toMatchObject({ numero: '5' });
    expect(kpi(el, 'total').texto).toContain('Total de depoimentos');
    expect(kpi(el, 'publicados')).toMatchObject({ numero: '3' });
    expect(kpi(el, 'ocultos')).toMatchObject({ numero: '2' });
    expect(kpi(el, 'novosNoMes')).toMatchObject({ numero: '1' });
    expect(kpi(el, 'novosNoMes').texto).toContain('Novos este mês');
    expect(kpi(el, 'empresas')).toMatchObject({ numero: '2' });
    expect(kpi(el, 'empresas').texto).toContain('Empresas representadas');
  });

  it('/resumo em 503 deixa os KPIs "indisponível" e a tabela aparece normalmente', async () => {
    const { el, responder, lista, resumo, texto } = await montar();
    await responder(resumo(), cmsErroReal(), { status: 503, statusText: 'Service Unavailable' });
    await responder(lista(), cmsDepoimentosListaReal());

    expect(kpi(el, 'total').numero).toBe('—');
    expect(kpi(el, 'total').texto).toContain('indisponível');
    expect(el.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(texto()).not.toContain('CMS indisponível');
  });

  it('busca, status Oculto, empresa B e data 01/09/2026 vão para o servidor', async () => {
    const { el, comp, responder, lista, resumo } = await montar();
    await responder(resumo(), cmsDepoimentosResumoReal());
    await responder(lista(), cmsDepoimentosListaReal());
    expect(el.querySelector('aurum-text-input input')?.getAttribute('placeholder')).toBe('Buscar por autor, empresa ou depoimento…');

    comp.busca.set('prova');
    comp.empresa.set('B');
    comp.selecionarStatus('inativo');
    await responder(lista(), cmsDepoimentosListaReal());

    // O <input type="date"> entrega yyyy-MM-dd — exibido como dd/mm/aaaa pelo navegador.
    comp.selecionarDesde('2026-09-01');
    const req = lista();
    expect(req.request.params.get('busca')).toBe('prova');
    expect(req.request.params.get('status')).toBe('inativo');
    expect(req.request.params.get('empresa')).toBe('B');
    expect(req.request.params.get('desde')).toBe('2026-09-01');
    expect(req.request.params.get('page')).toBe('1');
    await responder(req, cmsDepoimentosListaReal());
  });

  it('empresa digitada espera 300 ms antes de filtrar', async () => {
    vi.useFakeTimers();
    try {
      const { comp, http } = await montar();
      http.expectOne(RESUMO).flush(cmsDepoimentosResumoReal());
      http.expectOne((r) => r.url === URL).flush(cmsDepoimentosListaReal());

      comp.digitar('empresa', 'Empresa Exemplo');
      http.expectNone((r) => r.url === URL);
      vi.advanceTimersByTime(300);
      const req = http.expectOne((r) => r.url === URL);
      expect(req.request.params.get('empresa')).toBe('Empresa Exemplo');
      req.flush(cmsDepoimentosListaReal());
    } finally {
      vi.useRealTimers();
    }
  });

  it('depoimento sem foto mostra as iniciais; a linha traz Nome/Cargo, Empresa, trecho, Data, Status e Ordem', async () => {
    const { el, responder, lista, resumo } = await montar();
    const pagina = cmsDepoimentosListaReal();
    pagina.itens[1].author = 'Carlos Exemplo'; // avatarUrl null na fixture
    await responder(resumo(), cmsDepoimentosResumoReal());
    await responder(lista(), pagina);

    const cabecalhos = Array.from(el.querySelectorAll('th')).map((th) => th.textContent?.trim());
    expect(cabecalhos).toEqual(['Autor', 'Nome / Cargo', 'Empresa', 'Depoimento', 'Data', 'Status', 'Ordem', 'Ações']);

    const [comFoto, semFoto] = Array.from(el.querySelectorAll('tbody tr'));
    expect(comFoto.querySelector('.dp-avatar img')?.getAttribute('src')).toBe(pagina.itens[0].avatarUrl);

    const celulas = Array.from(semFoto.querySelectorAll('td')).map((td) => td.textContent?.trim());
    expect(celulas[0]).toBe('CE');
    expect(celulas[1]).toContain('Carlos Exemplo');
    expect(celulas[1]).toContain('Diretora Comercial');
    expect(celulas[2]).toBe('—');
    expect(celulas[3]).toBe('“Segundo depoimento fictício, sem empresa e sem foto.”');
    expect(celulas[4]).toBe('10/09/2026');
    expect(celulas[5]).toBe('Oculto');
    expect(celulas[6]).toBe('#2');
  });

  it('relato longo vira trecho com reticências na tabela', async () => {
    const { el, responder, lista, resumo } = await montar();
    const pagina = cmsDepoimentosListaReal();
    pagina.itens[0].content = 'x'.repeat(120);
    await responder(resumo(), cmsDepoimentosResumoReal());
    await responder(lista(), pagina);
    expect(el.querySelector('tbody tr .dp-trecho')?.textContent?.trim()).toBe(`“${'x'.repeat(60)}…”`);
  });

  it('"ver" abre a prévia do card do site: foto ou iniciais, relato inteiro e "Cargo · Empresa"', async () => {
    const { el, responder, lista, resumo, fixture } = await montar();
    await responder(resumo(), cmsDepoimentosResumoReal());
    await responder(lista(), cmsDepoimentosListaReal());

    (el.querySelector('button[aria-label="Ver Pessoa Fictícia Um"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    const dialogo = el.querySelector('[role=dialog]')!;
    expect(dialogo.textContent).toContain('Prévia no site');
    expect(dialogo.querySelector('blockquote')?.textContent).toBe('“Depoimento fictício usado apenas em testes de contrato.”');
    expect(dialogo.textContent).toContain('Gerente de Marketing · Empresa Exemplo Fictícia');
    expect(dialogo.querySelector('.dp-avatar img')).not.toBeNull();
  });

  it('publicar um depoimento oculto pede confirmação antes do PATCH /status e recarrega os KPIs', async () => {
    const { el, http, responder, lista, resumo, fixture } = await montar();
    const pagina = cmsDepoimentosListaReal();
    await responder(resumo(), cmsDepoimentosResumoReal());
    await responder(lista(), pagina);

    (el.querySelector('button[aria-label="Publicar Pessoa Fictícia Um"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el.querySelector('[role=dialog]')?.textContent).toContain('Publicar depoimento?');
    http.expectNone((r) => r.url.endsWith('/status'));

    const publicar = Array.from(el.querySelectorAll('[role=dialog] button')).find((b) => b.textContent?.trim() === 'Publicar') as HTMLButtonElement;
    publicar.click();
    const patch = http.expectOne(`${URL}/${pagina.itens[0].id}/status`);
    expect(patch.request.body).toEqual({ ativo: true });
    // Resposta só em memória: nenhum registro real é publicado por teste.
    await responder(patch, { item: { ...pagina.itens[0], ativo: true }, avisos: [] });
    await responder(resumo(), cmsDepoimentosResumoReal());

    expect(el.querySelector('[role=dialog]')).toBeNull();
    expect(el.querySelector('tbody tr aurum-status-pill')?.textContent?.trim()).toBe('Publicado');
  });

  it('editar aponta para /marketing/depoimentos/:id e "+ Novo" para /novo', async () => {
    const { el, responder, lista, resumo } = await montar();
    await responder(resumo(), cmsDepoimentosResumoReal());
    await responder(lista(), cmsDepoimentosListaReal());
    expect(el.querySelector('a[aria-label="Editar Pessoa Fictícia Um"]')?.getAttribute('href')).toBe(
      '/marketing/depoimentos/00000000-0000-4000-8000-000000000301'
    );
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    (el.querySelector('aurum-page-header aurum-button') as HTMLElement).click();
    expect(navegar).toHaveBeenCalledWith(['/marketing/depoimentos/novo']);
  });

  it('carregando enquanto a lista não chega', async () => {
    const { texto, responder, lista, resumo } = await montar();
    expect(texto()).toContain('Carregando depoimentos…');
    await responder(resumo(), cmsDepoimentosResumoReal());
    await responder(lista(), cmsDepoimentosListaReal());
  });

  it('vazio, 500 e 503 mostram o estado correspondente', async () => {
    const { texto, responder, lista, resumo, comp } = await montar();
    await responder(resumo(), cmsDepoimentosResumoReal());
    await responder(lista(), { itens: [], page: 1, pageSize: 10, total: 0, totalPaginas: 0 });
    expect(texto()).toContain('Nenhum depoimento encontrado para este filtro.');

    comp.carregar();
    await responder(lista(), null, { status: 500, statusText: 'Server Error' });
    expect(texto()).toContain('Não foi possível carregar os depoimentos.');

    comp.carregar();
    await responder(lista(), cmsErroReal(), { status: 503, statusText: 'Service Unavailable' });
    expect(texto()).toContain('CMS indisponível');
  });
});

describe('iniciais e assinatura do card', () => {
  it.each([
    ['Carlos Exemplo', 'CE'],
    ['Pessoa Fictícia Dois', 'PD'],
    ['  ana  ', 'A'],
    ['', '?'],
  ])('"%s" → %s', (nome, esperado) => {
    expect(iniciais(nome)).toBe(esperado);
  });

  it('"Cargo · Empresa" ignora o que vier null ou vazio', () => {
    expect(assinatura({ role: 'CMO', company: 'Empresa A' })).toBe('CMO · Empresa A');
    expect(assinatura({ role: 'CMO', company: null })).toBe('CMO');
    expect(assinatura({ role: null, company: ' ' })).toBe('');
  });
});
