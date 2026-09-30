import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BrandingPublico, BrandingService } from '../../../core/branding/branding.service';
import { cmsBannerDetalheReal, cmsBannerSalvoAvisosReal } from '../../../../testing/contratos/contratos';
import { AurumDropzoneComponent } from '../../../shared/aurum/aurum-dropzone.component';
import { BannersFormComponent, TOAST_SALVO } from './banners-form.component';
import { By } from '@angular/platform-browser';

const MB = 1024 * 1024;
const URL = '/api/wl/cms/banners';

function arquivo(nome: string, tipo: string, bytes = 1000): File {
  const f = new File(['x'], nome, { type: tipo });
  Object.defineProperty(f, 'size', { value: bytes });
  return f;
}

/**
 * Card 6fcc4aa2 (VEI-RD-14), formulário `173:2`. Estado definido ANTES da
 * única `autoDetectChanges()`; `whenStable()` depois de cada `flush()`.
 *
 * "Abrir hotsite" exige um banner ATIVO: coberto só aqui, com fixture em
 * memória — em QA manual isso publicaria no site de produção (ADR-CMS-004).
 */
describe('BannersFormComponent — Figma 173:2', () => {
  function configurar(branding: Partial<BrandingPublico> | null = { nomeExibicao: 'Marca', cmsHabilitado: true, cmsSiteUrl: 'https://site.exemplo' }) {
    TestBed.configureTestingModule({
      imports: [BannersFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: BrandingService, useValue: { branding: signal(branding) } },
      ],
    });
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function montar(id?: string) {
    const fixture = TestBed.createComponent(BannersFormComponent);
    if (id) fixture.componentRef.setInput('id', id);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      el,
      comp: fixture.componentInstance,
      http: TestBed.inject(HttpTestingController),
      texto: () => el.textContent ?? '',
      dropzones: () => fixture.debugElement.queryAll(By.directive(AurumDropzoneComponent)).map((d) => d.componentInstance as AurumDropzoneComponent),
    };
  }

  /** Preenche um banner link válido direto nos signals do formulário. */
  function preencherLink(comp: BannersFormComponent) {
    comp.titulo.set('Banner fictício de QA');
    comp.destino.set('https://exemplo.com.br/campanha-ficticia');
    comp.imagem.set(arquivo('banner.webp', 'image/webp'));
  }

  it('novo banner nasce Inativo e com a ordem no fim da fila', async () => {
    configurar();
    const { el, comp, texto } = await montar();

    expect(comp.ativo()).toBe(false);
    expect(el.querySelector('[role=switch]')?.getAttribute('aria-checked')).toBe('false');
    expect(texto()).toContain('Inativo');
    const ordem = el.querySelector('input[name=ordem]') as HTMLInputElement;
    expect(ordem.value).toBe('');
    expect(ordem.placeholder).toBe('Fim da fila');
    expect(texto()).toContain('Novo Banner');
  });

  it('sem displayOrder e com ativo=false, o POST deixa o BFF pôr no fim da fila', async () => {
    configurar();
    const { comp, http } = await montar();
    preencherLink(comp);
    comp.salvar();

    const req = http.expectOne(URL);
    const corpo = req.request.body as FormData;
    expect(req.request.method).toBe('POST');
    expect(corpo.has('displayOrder')).toBe(false);
    expect(corpo.get('ativo')).toBe('false');
    expect(corpo.get('tipoDestino')).toBe('link');
    expect(corpo.get('destino')).toBe('https://exemplo.com.br/campanha-ficticia');
    expect(corpo.get('html')).toBeNull();
    expect((corpo.get('imagem') as File).name).toBe('banner.webp');
    req.flush({ item: cmsBannerDetalheReal(), avisos: [] }, { status: 201, statusText: 'Created' });
  });

  it('dropzone de imagem aceita PNG/JPG/WebP até 5 MB e barra .gif e 6 MB sem requisição', async () => {
    configurar();
    const { comp, dropzones, http, fixture } = await montar();
    const [dzImagem] = dropzones();
    expect(dzImagem.accept).toBe('image/png,image/jpeg,image/webp');
    expect(dzImagem.maxBytes).toBe(5 * MB);

    dzImagem.receber(arquivo('anim.gif', 'image/gif'));
    await fixture.whenStable();
    expect(dzImagem.erro()).toContain('Formato não aceito');
    dzImagem.receber(arquivo('grande.png', 'image/png', 6 * MB));
    await fixture.whenStable();
    expect(dzImagem.erro()).toContain('passa do limite de 5 MB');
    expect(comp.imagem()).toBeNull();

    comp.titulo.set('Banner fictício');
    comp.destino.set('https://exemplo.com.br');
    comp.salvar();
    http.expectNone(URL);
  });

  it('dropzone de HTML barra .html de 2,5 MB antes do envio', async () => {
    configurar();
    const { comp, dropzones, fixture } = await montar();
    comp.trocarTipo('html');
    await fixture.whenStable();

    const dzHtml = dropzones()[1];
    expect(dzHtml.maxBytes).toBe(2 * MB);
    dzHtml.receber(arquivo('hotsite.html', 'text/html', 2.5 * MB));
    await fixture.whenStable();
    expect(dzHtml.erro()).toContain('passa do limite de 2 MB');
    expect(comp.html()).toBeNull();
  });

  it('trocar Link → HTML limpa a URL e passa a exigir o .html', async () => {
    configurar();
    const { comp, el, fixture, http } = await montar();
    preencherLink(comp);
    comp.trocarTipo('html');
    comp.salvar();
    await fixture.whenStable();

    expect(comp.destino()).toBe('');
    expect(el.querySelector('input[name=destino]')).toBeNull();
    expect(el.textContent).toContain('Envie o arquivo .html do hotsite.');
    http.expectNone(URL);
  });

  it('trocar HTML → Link descarta o .html escolhido', async () => {
    configurar();
    const { comp } = await montar();
    comp.trocarTipo('html');
    comp.html.set(arquivo('hotsite.html', 'text/html'));
    comp.trocarTipo('link');
    expect(comp.html()).toBeNull();
  });

  it.each(['http://site', 'ftp://x', 'site.com.br', 'https://'])('URL de link "%s" é recusada: exige https:// ou #…', async (destino) => {
    configurar();
    const { comp, el, fixture, http } = await montar();
    preencherLink(comp);
    comp.destino.set(destino);
    comp.salvar();
    await fixture.whenStable();

    expect(el.textContent).toContain('Use um endereço https:// ou uma âncora #secao.');
    http.expectNone(URL);
  });

  it.each(['https://exemplo.com.br/x', '#ofertas'])('URL de link "%s" é aceita', async (destino) => {
    configurar();
    const { comp } = await montar();
    preencherLink(comp);
    comp.destino.set(destino);
    expect(comp.erros().destino).toBeUndefined();
  });

  it('salvar banner HTML mostra os avisos do BFF e o toast', async () => {
    configurar();
    const { comp, el, http, fixture, texto } = await montar();
    comp.titulo.set('Hotsite Fictício de Teste');
    comp.trocarTipo('html');
    comp.html.set(arquivo('hotsite.html', 'text/html'));
    comp.imagem.set(arquivo('banner.png', 'image/png'));
    comp.salvar();

    const req = http.expectOne(URL);
    expect((req.request.body as FormData).get('destino')).toBeNull();
    req.flush(cmsBannerSalvoAvisosReal(), { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    expect(texto()).toContain('O HTML usa um endereço relativo em src: img/a.png.');
    expect(el.querySelector('.mkf-toast')?.textContent?.trim()).toBe(TOAST_SALVO);
    expect(TOAST_SALVO).toBe('Salvo. O site é atualizado em até 5 minutos.');
    // A fixture é inativa: sem link de hotsite.
    expect(el.querySelector('a.mkf-hotsite')).toBeNull();
  });

  it('banner html ATIVO salvo mostra "Abrir hotsite" com o cmsSiteUrl da instância', async () => {
    configurar();
    const { comp, el, http, fixture } = await montar();
    comp.titulo.set('Hotsite Fictício de Teste');
    comp.trocarTipo('html');
    comp.html.set(arquivo('hotsite.html', 'text/html'));
    comp.imagem.set(arquivo('banner.png', 'image/png'));
    comp.ativo.set(true);
    comp.salvar();

    const salvo = cmsBannerSalvoAvisosReal();
    salvo.item.ativo = true; // só em memória
    http.expectOne(URL).flush(salvo, { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    const link = el.querySelector('a.mkf-hotsite') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Abrir hotsite');
    expect(link.getAttribute('href')).toBe(`https://site.exemplo/ofertas/${salvo.item.id}`);
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('banner do tipo link, mesmo ativo, não mostra "Abrir hotsite"', async () => {
    configurar();
    const { comp, el, http, fixture } = await montar();
    preencherLink(comp);
    comp.salvar();
    http.expectOne(URL).flush({ item: { ...cmsBannerDetalheReal(), ativo: true }, avisos: [] }, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    expect(el.querySelector('a.mkf-hotsite')).toBeNull();
  });

  it('branding com cmsSiteUrl null não mostra "Abrir hotsite" nem para html ativo', async () => {
    configurar({ nomeExibicao: 'Marca', cmsHabilitado: true, cmsSiteUrl: null });
    const { comp, el, http, fixture } = await montar();
    comp.titulo.set('Hotsite Fictício');
    comp.trocarTipo('html');
    comp.html.set(arquivo('hotsite.html', 'text/html'));
    comp.imagem.set(arquivo('banner.png', 'image/png'));
    comp.salvar();
    const salvo = cmsBannerSalvoAvisosReal();
    salvo.item.ativo = true;
    http.expectOne(URL).flush(salvo, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    expect(el.querySelector('a.mkf-hotsite')).toBeNull();
  });

  it('400 do BFF (magic bytes) mostra a mensagem e mantém os campos', async () => {
    configurar();
    const { comp, el, http, fixture } = await montar();
    preencherLink(comp);
    comp.salvar();
    http.expectOne(URL).flush({ message: 'O arquivo não é uma imagem PNG, JPG ou WebP válida.' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('O arquivo não é uma imagem PNG, JPG ou WebP válida.');
    expect((el.querySelector('input[name=titulo]') as HTMLInputElement).value).toBe('Banner fictício de QA');
    expect((el.querySelector('input[name=destino]') as HTMLInputElement).value).toBe('https://exemplo.com.br/campanha-ficticia');
  });

  it('edição carrega o banner, faz PUT sem exigir nova imagem e mantém o status atual', async () => {
    configurar();
    const detalhe = cmsBannerDetalheReal();
    const { comp, el, http, fixture, texto } = await montar(detalhe.id);
    http.expectOne(`${URL}/${detalhe.id}`).flush(detalhe);
    await fixture.whenStable();

    expect(texto()).toContain('Editar Banner');
    expect((el.querySelector('input[name=titulo]') as HTMLInputElement).value).toBe('Banner Fictício de Teste');
    expect((el.querySelector('input[name=ordem]') as HTMLInputElement).value).toBe('1');
    expect(el.querySelector('aurum-dropzone img')?.getAttribute('src')).toBe(detalhe.imageUrl);

    comp.salvar();
    const req = http.expectOne(`${URL}/${detalhe.id}`);
    expect(req.request.method).toBe('PUT');
    const corpo = req.request.body as FormData;
    expect(corpo.get('imagem')).toBeNull();
    expect(corpo.get('displayOrder')).toBe('1');
    expect(corpo.get('ativo')).toBe('false');
    req.flush({ item: detalhe, avisos: [] });
  });

  it('nome obrigatório: sem ele nada é enviado', async () => {
    configurar();
    const { comp, el, http, fixture } = await montar();
    preencherLink(comp);
    comp.titulo.set('   ');
    comp.salvar();
    await fixture.whenStable();
    expect(el.textContent).toContain('Informe o nome do banner.');
    http.expectNone(URL);
  });
});
