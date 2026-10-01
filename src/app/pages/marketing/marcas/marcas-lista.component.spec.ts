import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BrandingService } from '../../../core/branding/branding.service';
import { cmsErroReal, cmsMarcasListaReal } from '../../../../testing/contratos/contratos';
import { MarcasListaComponent } from './marcas-lista.component';

/**
 * Card 5a05f573 (VEI-RD-12), lista `157:636`. Uma única `autoDetectChanges()`;
 * `whenStable()` depois de cada `flush()`.
 */
describe('MarcasListaComponent — Figma 157:636', () => {
  const URL = '/api/wl/cms/marcas';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarcasListaComponent],
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
    const fixture = TestBed.createComponent(MarcasListaComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.autoDetectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const responder = async (req: TestRequest, corpo: object | null, opcoes?: { status: number; statusText: string }) => {
      req.flush(corpo, opcoes);
      await fixture.whenStable();
    };
    return { fixture, http, el, comp: fixture.componentInstance, responder, texto: () => el.textContent ?? '' };
  }

  it('cada card mostra logo sobre fundo neutro, nome, badge e "Ordem de exibição #N"', async () => {
    const { http, el, texto, responder } = await montar();
    await responder(http.expectOne((r) => r.url === URL), cmsMarcasListaReal());

    const [svg, png] = Array.from(el.querySelectorAll('article.mk-card'));
    expect(svg.querySelector('.mc-logo img')?.getAttribute('src')).toMatch(/\.svg$/);
    expect(svg.querySelector('.mk-titulo')?.textContent).toBe('Marca Fictícia A');
    expect(svg.querySelector('aurum-status-pill')?.textContent?.trim()).toBe('Inativo');
    expect(svg.querySelector('.mk-ordem')?.textContent?.trim()).toBe('#1');
    expect(png.querySelector('.mk-ordem')?.textContent?.trim()).toBe('#2');
    expect(texto()).toContain('Marcas Parceiras');
    expect(texto()).toContain('2 cadastradas');
  });

  it('o subtítulo usa a marca da instância vinda do branding, não "Outdoor Premium"', async () => {
    const { http, texto, responder } = await montar();
    await responder(http.expectOne((r) => r.url === URL), cmsMarcasListaReal());
    expect(texto()).toContain('Logomarcas exibidas no carrossel de parceiros do site institucional da Exibidora Exemplo.');
    expect(texto()).not.toContain('Outdoor Premium');
  });

  it('busca por nome e filtro Ativo vão para o servidor', async () => {
    const { http, comp, el, responder } = await montar();
    await responder(http.expectOne((r) => r.url === URL), cmsMarcasListaReal());
    expect(el.querySelector('aurum-text-input input')?.getAttribute('placeholder')).toBe('Buscar por nome da marca…');

    comp.busca.set('Fictícia');
    comp.selecionarStatus('ativo');
    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('busca')).toBe('Fictícia');
    expect(req.request.params.get('status')).toBe('ativo');
    expect(req.request.params.get('page')).toBe('1');
    await responder(req, cmsMarcasListaReal());
  });

  it('o power pede confirmação antes do PATCH /status', async () => {
    const { http, el, responder, fixture } = await montar();
    const pagina = cmsMarcasListaReal();
    pagina.itens[0].ativo = true; // só em memória
    await responder(http.expectOne((r) => r.url === URL), pagina);

    (el.querySelector('button[aria-label="Inativar Marca Fictícia A"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el.querySelector('[role=dialog]')?.textContent).toContain('Inativar marca?');
    http.expectNone((r) => r.url.endsWith('/status'));

    const confirmar = Array.from(el.querySelectorAll('[role=dialog] button')).find((b) => b.textContent?.trim() === 'Inativar') as HTMLButtonElement;
    confirmar.click();
    const patch = http.expectOne(`${URL}/${pagina.itens[0].id}/status`);
    expect(patch.request.body).toEqual({ ativo: false });
    await responder(patch, { item: { ...pagina.itens[0], ativo: false }, avisos: [] });
    expect(el.querySelector('[role=dialog]')).toBeNull();
  });

  it('carregando: mostra o estado enquanto a resposta não chega', async () => {
    const { http, texto, responder } = await montar();
    expect(texto()).toContain('Carregando marcas…');
    await responder(http.expectOne((r) => r.url === URL), cmsMarcasListaReal());
  });

  it('vazio: mostra o estado vazio', async () => {
    const { http, texto, responder } = await montar();
    await responder(http.expectOne((r) => r.url === URL), { itens: [], page: 1, pageSize: 12, total: 0, totalPaginas: 0 });
    expect(texto()).toContain('Nenhuma marca encontrada para este filtro.');
  });

  it('500: mostra o erro com tentar novamente', async () => {
    const { http, texto, responder } = await montar();
    await responder(http.expectOne((r) => r.url === URL), null, { status: 500, statusText: 'Server Error' });
    expect(texto()).toContain('Não foi possível carregar as marcas.');
    expect(texto()).toContain('Tentar novamente');
  });

  it('503: mostra "CMS indisponível"', async () => {
    const { http, texto, responder } = await montar();
    await responder(http.expectOne((r) => r.url === URL), cmsErroReal(), { status: 503, statusText: 'Service Unavailable' });
    expect(texto()).toContain('CMS indisponível');
  });

  it('+ Nova Marca navega para /marketing/marcas/nova', async () => {
    const { http, el, responder } = await montar();
    await responder(http.expectOne((r) => r.url === URL), cmsMarcasListaReal());
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    (el.querySelector('aurum-page-header aurum-button') as HTMLElement).click();
    expect(navegar).toHaveBeenCalledWith(['/marketing/marcas/nova']);
  });
});
