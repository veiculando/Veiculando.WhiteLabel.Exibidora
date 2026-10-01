import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { cmsMarcaDetalheReal } from '../../../../testing/contratos/contratos';
import { AurumDropzoneComponent } from '../../../shared/aurum/aurum-dropzone.component';
import { MarcasFormComponent } from './marcas-form.component';

const MB = 1024 * 1024;
const URL = '/api/wl/cms/marcas';

function arquivo(nome: string, tipo: string, bytes = 1000): File {
  const f = new File(['x'], nome, { type: tipo });
  Object.defineProperty(f, 'size', { value: bytes });
  return f;
}

/** Card 5a05f573 (VEI-RD-12), formulário `173:553`. */
describe('MarcasFormComponent — Figma 173:553', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MarcasFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function montar(id?: string) {
    const fixture = TestBed.createComponent(MarcasFormComponent);
    if (id) fixture.componentRef.setInput('id', id);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      el,
      comp: fixture.componentInstance,
      http: TestBed.inject(HttpTestingController),
      dropzone: () => fixture.debugElement.query(By.directive(AurumDropzoneComponent)).componentInstance as AurumDropzoneComponent,
    };
  }

  function preencher(comp: MarcasFormComponent) {
    comp.nome.set('Marca Fictícia de QA');
    comp.ordem.set(3);
    comp.logo.set(arquivo('logo.svg', 'image/svg+xml'));
  }

  it('nova marca nasce Inativa e com a ordem no fim da fila', async () => {
    const { el, comp } = await montar();
    expect(comp.ativo()).toBe(false);
    expect(el.querySelector('[role=switch]')?.getAttribute('aria-checked')).toBe('false');
    const ordem = el.querySelector('input[name=ordem]') as HTMLInputElement;
    expect(ordem.value).toBe('');
    expect(ordem.placeholder).toBe('Fim da fila');
    expect(el.textContent).toContain('Nova Marca');
  });

  it('dropzone aceita PNG, JPG, WebP e SVG até 2 MB e barra um PNG de 3 MB antes do envio', async () => {
    const { dropzone, comp, fixture, http } = await montar();
    const dz = dropzone();
    expect(dz.accept).toBe('image/png,image/jpeg,image/webp,image/svg+xml');
    expect(dz.maxBytes).toBe(2 * MB);
    expect(dz.validar(arquivo('logo.svg', 'image/svg+xml'))).toBeNull();

    dz.receber(arquivo('logo.png', 'image/png', 3 * MB));
    await fixture.whenStable();
    expect(dz.erro()).toContain('passa do limite de 2 MB');
    expect(comp.logo()).toBeNull();

    comp.nome.set('Marca Fictícia');
    comp.salvar();
    http.expectNone(URL);
  });

  it('SVG com <script> recusado pelo BFF: a mensagem aparece legível e nome e ordem ficam', async () => {
    const { comp, el, http, fixture } = await montar();
    preencher(comp);
    comp.salvar();

    const req = http.expectOne(URL);
    expect((req.request.body as FormData).get('displayOrder')).toBe('3');
    req.flush({ message: 'O SVG contém script ou conteúdo ativo e foi recusado.' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent?.trim()).toBe('O SVG contém script ou conteúdo ativo e foi recusado.');
    expect((el.querySelector('input[name=nome]') as HTMLInputElement).value).toBe('Marca Fictícia de QA');
    expect((el.querySelector('input[name=ordem]') as HTMLInputElement).value).toBe('3');
  });

  it('.png que é PDF: o 400 de tipo inválido aparece no formulário', async () => {
    const { comp, el, http, fixture } = await montar();
    preencher(comp);
    comp.logo.set(arquivo('logo.png', 'image/png'));
    comp.salvar();
    http.expectOne(URL).flush({ message: 'O arquivo não é uma imagem válida.' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('O arquivo não é uma imagem válida.');
  });

  it('salvar marca fictícia inativa: POST com ativo=false, displayOrder e o toast', async () => {
    const { comp, el, http, fixture } = await montar();
    preencher(comp);
    comp.salvar();

    const req = http.expectOne(URL);
    const corpo = req.request.body as FormData;
    expect(req.request.method).toBe('POST');
    expect(corpo.get('name')).toBe('Marca Fictícia de QA');
    expect(corpo.get('ativo')).toBe('false');
    expect(corpo.get('displayOrder')).toBe('3');
    expect((corpo.get('imagem') as File).name).toBe('logo.svg');
    req.flush({ item: cmsMarcaDetalheReal(), avisos: [] }, { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    expect(el.querySelector('.mkf-toast')?.textContent).toContain('O site é atualizado em até 5 minutos.');
  });

  it('ordem em branco não vai no POST: o BFF põe a marca no fim da fila', async () => {
    const { comp, http } = await montar();
    preencher(comp);
    comp.ordem.set(null);
    comp.salvar();
    const req = http.expectOne(URL);
    expect((req.request.body as FormData).has('displayOrder')).toBe(false);
    req.flush({ item: cmsMarcaDetalheReal(), avisos: [] }, { status: 201, statusText: 'Created' });
  });

  it('edição carrega a marca e faz PUT sem exigir novo logo', async () => {
    const detalhe = cmsMarcaDetalheReal();
    const { comp, el, http, fixture } = await montar(detalhe.id);
    http.expectOne(`${URL}/${detalhe.id}`).flush(detalhe);
    await fixture.whenStable();

    expect(el.textContent).toContain('Editar Marca');
    expect((el.querySelector('input[name=nome]') as HTMLInputElement).value).toBe('Marca Fictícia A');
    expect(el.querySelector('aurum-dropzone img')?.getAttribute('src')).toBe(detalhe.imageUrl);

    comp.salvar();
    const req = http.expectOne(`${URL}/${detalhe.id}`);
    expect(req.request.method).toBe('PUT');
    expect((req.request.body as FormData).get('imagem')).toBeNull();
    req.flush({ item: detalhe, avisos: [] });
  });

  it('nome obrigatório', async () => {
    const { comp, el, http, fixture } = await montar();
    preencher(comp);
    comp.nome.set(' ');
    comp.salvar();
    await fixture.whenStable();
    expect(el.textContent).toContain('Informe o nome da marca.');
    http.expectNone(URL);
  });
});
