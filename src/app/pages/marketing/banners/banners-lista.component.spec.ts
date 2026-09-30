import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { cmsBannersListaReal, cmsErroReal } from '../../../../testing/contratos/contratos';
import { BannersListaComponent } from './banners-lista.component';

/**
 * Card 6fcc4aa2 (VEI-RD-14), lista `157:2`. Regras Angular 22 zoneless:
 * uma única chamada, `autoDetectChanges()` (dispara o ngOnInit), e depois de cada `flush()`
 * um `await whenStable()` — o estado é signal, a detecção vem do scheduler.
 */
describe('BannersListaComponent — Figma 157:2', () => {
  const URL = '/api/wl/cms/banners';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BannersListaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function montar() {
    const fixture = TestBed.createComponent(BannersListaComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.autoDetectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const responder = async (req: TestRequest, corpo: object | null, opcoes?: { status: number; statusText: string }) => {
      req.flush(corpo, opcoes);
      await fixture.whenStable();
    };
    return { fixture, http, el, comp: fixture.componentInstance, responder, texto: () => el.textContent ?? '' };
  }

  it('lista a fixture real: miniatura, título, badge, chip do tipo, URL/arquivo e ordem', async () => {
    const { http, el, texto, responder } = await montar();
    await responder(http.expectOne((r) => r.url === URL), cmsBannersListaReal());

    const [link, html] = Array.from(el.querySelectorAll('article.mk-card'));
    expect(link.querySelector('img')?.getAttribute('src')).toContain('/cms-assets/banners/');
    expect(link.querySelector('.mk-titulo')?.textContent).toBe('Banner Fictício de Teste');
    expect(link.querySelector('aurum-status-pill')?.textContent?.trim()).toBe('Inativo');
    expect(link.querySelector('.mk-chip')?.textContent?.trim()).toBe('Link Externo');
    expect(link.querySelector('.mk-info')?.textContent?.trim()).toBe('URL: exemplo.com.br/campanha-ficticia');
    expect(link.querySelector('.mk-ordem')?.textContent?.trim()).toBe('#11');

    expect(html.querySelector('.mk-chip')?.textContent?.trim()).toBe('Arquivo HTML');
    expect(html.querySelector('.mk-info')?.textContent?.trim()).toBe('Arquivo: 00000000-0000-4000-8000-00000000b102.html');
    expect(html.querySelector('.mk-ordem')?.textContent?.trim()).toBe('#12');

    expect(texto()).toContain('Gestão de Banners');
    expect(texto()).toContain('12 cadastrados');
  });

  it('o subtítulo cita o site institucional, não o app WhiteLabel', async () => {
    const { http, texto, responder } = await montar();
    await responder(http.expectOne((r) => r.url === URL), cmsBannersListaReal());
    expect(texto()).toContain('Vitrine de campanhas exibida no site institucional — banners com link externo ou hotsite em HTML.');
    expect(texto()).not.toContain('app WhiteLabel');
  });

  it('busca, chip Inativo e página 2 vão para o servidor', async () => {
    const { http, comp, responder } = await montar();
    await responder(http.expectOne((r) => r.url === URL), cmsBannersListaReal());

    comp.busca.set('Hotsite');
    comp.selecionarStatus('inativo');
    const filtrada = http.expectOne((r) => r.url === URL);
    expect(filtrada.request.params.get('status')).toBe('inativo');
    expect(filtrada.request.params.get('page')).toBe('1');
    await responder(filtrada, { ...cmsBannersListaReal(), page: 1 });

    comp.irParaPagina(2);
    const pagina2 = http.expectOne((r) => r.url === URL);
    expect(pagina2.request.params.get('busca')).toBe('Hotsite');
    expect(pagina2.request.params.get('status')).toBe('inativo');
    expect(pagina2.request.params.get('page')).toBe('2');
    expect(pagina2.request.params.get('pageSize')).toBe('12');
    await responder(pagina2, cmsBannersListaReal());
  });

  it('a busca digitada espera 300 ms e volta para a página 1', async () => {
    vi.useFakeTimers();
    try {
      const { http, comp } = await montar();
      http.expectOne((r) => r.url === URL).flush(cmsBannersListaReal());

      comp.buscar('hot');
      comp.buscar('hotsite');
      http.expectNone((r) => r.url === URL);
      vi.advanceTimersByTime(300);

      const req = http.expectOne((r) => r.url === URL);
      expect(req.request.params.get('busca')).toBe('hotsite');
      expect(req.request.params.get('page')).toBe('1');
      req.flush(cmsBannersListaReal());
    } finally {
      vi.useRealTimers();
    }
  });

  it('usa o wl-paginador compartilhado com o total do servidor', async () => {
    const { http, el, responder } = await montar();
    await responder(http.expectOne((r) => r.url === URL), cmsBannersListaReal());
    expect(el.querySelector('app-paginador')?.textContent).toContain('Página 2 de 2');
  });

  it('503 mostra "CMS indisponível" com tentar novamente', async () => {
    const { http, el, texto, responder } = await montar();
    await responder(http.expectOne((r) => r.url === URL), cmsErroReal(), { status: 503, statusText: 'Service Unavailable' });

    expect(texto()).toContain('CMS indisponível');
    expect(texto()).toContain(cmsErroReal().message);
    const tentar = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Tentar novamente'))!;
    tentar.click();
    await responder(http.expectOne((r) => r.url === URL), cmsBannersListaReal());
    expect(el.querySelectorAll('article.mk-card')).toHaveLength(2);
  });

  it('página vazia mostra o estado vazio', async () => {
    const { http, texto, responder } = await montar();
    await responder(http.expectOne((r) => r.url === URL), { itens: [], page: 1, pageSize: 12, total: 0, totalPaginas: 0 });
    expect(texto()).toContain('Nenhum banner encontrado para este filtro.');
    expect(texto()).toContain('0 cadastrados');
  });

  it('500 mostra o erro com tentar novamente, sem "CMS indisponível"', async () => {
    const { http, texto, responder } = await montar();
    await responder(http.expectOne((r) => r.url === URL), null, { status: 500, statusText: 'Server Error' });
    expect(texto()).toContain('Não foi possível carregar os banners.');
    expect(texto()).toContain('Tentar novamente');
    expect(texto()).not.toContain('CMS indisponível');
  });

  it('o power pede confirmação antes do PATCH /status', async () => {
    const { http, el, responder, fixture } = await montar();
    const pagina = cmsBannersListaReal();
    pagina.itens[0].ativo = true; // estado só da fixture em memória, nunca em QA real
    await responder(http.expectOne((r) => r.url === URL), pagina);

    (el.querySelector('button[aria-label="Inativar Banner Fictício de Teste"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    const dialogo = el.querySelector('[role=dialog]');
    expect(dialogo?.textContent).toContain('Inativar banner?');
    http.expectNone((r) => r.url.endsWith('/status'));

    const confirmar = Array.from(dialogo!.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Inativar')!;
    confirmar.click();
    const patch = http.expectOne(`${URL}/${pagina.itens[0].id}/status`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ ativo: false });
    await responder(patch, { item: { ...pagina.itens[0], ativo: false }, avisos: [] });

    expect(el.querySelector('[role=dialog]')).toBeNull();
    expect(el.querySelector('article.mk-card aurum-status-pill')?.textContent?.trim()).toBe('Inativo');
  });

  it('cancelar a confirmação não envia nada', async () => {
    const { http, el, responder, fixture } = await montar();
    await responder(http.expectOne((r) => r.url === URL), cmsBannersListaReal());

    (el.querySelector('button[aria-label="Ativar Banner Fictício de Teste"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    const cancelar = Array.from(el.querySelectorAll('[role=dialog] button')).find((b) => b.textContent?.trim() === 'Cancelar') as HTMLButtonElement;
    cancelar.click();
    await fixture.whenStable();

    expect(el.querySelector('[role=dialog]')).toBeNull();
    http.expectNone((r) => r.url.endsWith('/status'));
  });

  it('+ Novo Banner navega para /marketing/banners/novo e editar aponta para o id', async () => {
    const { http, el, responder } = await montar();
    await responder(http.expectOne((r) => r.url === URL), cmsBannersListaReal());
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    (el.querySelector('aurum-page-header aurum-button') as HTMLElement).click();
    expect(navegar).toHaveBeenCalledWith(['/marketing/banners/novo']);
    expect(el.querySelector('a[aria-label="Editar Banner Fictício de Teste"]')?.getAttribute('href')).toBe(
      '/marketing/banners/00000000-0000-4000-8000-000000000101'
    );
  });
});
