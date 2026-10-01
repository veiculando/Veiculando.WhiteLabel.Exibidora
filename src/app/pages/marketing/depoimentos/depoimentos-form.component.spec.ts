import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { cmsDepoimentoDetalheReal, cmsDepoimentosListaReal } from '../../../../testing/contratos/contratos';
import { AurumDropzoneComponent } from '../../../shared/aurum/aurum-dropzone.component';
import { DepoimentosFormComponent } from './depoimentos-form.component';

const MB = 1024 * 1024;
const URL = '/api/wl/cms/depoimentos';

function arquivo(nome: string, tipo: string, bytes = 1000): File {
  const f = new File(['x'], nome, { type: tipo });
  Object.defineProperty(f, 'size', { value: bytes });
  return f;
}

/** Card 3867cce1 (VEI-RD-8), formulário `173:1044`. Dados fictícios e sempre Ocultos. */
describe('DepoimentosFormComponent — Figma 173:1044', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DepoimentosFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function montar(id?: string) {
    const fixture = TestBed.createComponent(DepoimentosFormComponent);
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

  function preencher(comp: DepoimentosFormComponent) {
    comp.autor.set('Pessoa Fictícia de QA');
    comp.empresa.set('Empresa Exemplo Fictícia');
    comp.cargo.set('Gerente de Marketing');
    comp.relato.set('Depoimento fictício de QA, sem citação de empresa real.');
  }

  it('novo depoimento nasce Oculto, com a ordem no fim da fila e Empresa e Cargo separados', async () => {
    const { el, comp } = await montar();
    expect(comp.publicado()).toBe(false);
    expect(el.querySelector('[role=switch]')?.getAttribute('aria-checked')).toBe('false');
    expect(el.querySelector('.mkf-pill')?.textContent?.trim()).toBe('Oculto');
    const ordem = el.querySelector('input[name=ordem]') as HTMLInputElement;
    expect(ordem.value).toBe('');
    expect(ordem.placeholder).toBe('Fim da fila');
    expect(el.querySelector('input[name=empresa]')).not.toBeNull();
    expect(el.querySelector('input[name=cargo]')).not.toBeNull();
    expect(el.textContent).toContain('Novo Depoimento');
  });

  it('relato com 401 caracteres: o contador indica o excesso e o salvamento fica bloqueado', async () => {
    const { el, comp, fixture, http } = await montar();
    preencher(comp);
    comp.relato.set('a'.repeat(401));
    await fixture.whenStable();

    const contador = el.querySelector('.dpf-contador')!;
    expect(contador.textContent?.trim()).toBe('401/400');
    expect(contador.classList).toContain('dpf-contador--excesso');
    expect(el.textContent).toContain('passa de 400 caracteres');
    expect((el.querySelector('aurum-button[tipo=submit] button') as HTMLButtonElement).disabled).toBe(true);

    comp.salvar();
    http.expectNone(URL);
  });

  it('400 caracteres exatos é aceito', async () => {
    const { comp } = await montar();
    preencher(comp);
    comp.relato.set('a'.repeat(400));
    expect(comp.erros().relato).toBeUndefined();
  });

  it('sem nome do autor ou sem relato: mensagens de obrigatório e nada é enviado', async () => {
    const { el, comp, fixture, http } = await montar();
    comp.salvar();
    await fixture.whenStable();
    expect(el.textContent).toContain('Informe o nome do autor.');
    expect(el.textContent).toContain('Escreva o depoimento.');
    http.expectNone(URL);
  });

  it('avatar opcional: dropzone PNG/JPG/WebP até 2 MB; sem foto o POST segue sem o campo', async () => {
    const { comp, dropzone, http } = await montar();
    expect(dropzone().accept).toBe('image/png,image/jpeg,image/webp');
    expect(dropzone().maxBytes).toBe(2 * MB);

    preencher(comp);
    comp.salvar();
    const req = http.expectOne(URL);
    expect((req.request.body as FormData).get('avatar')).toBeNull();
    req.flush({ item: cmsDepoimentosListaReal().itens[1], avisos: [] }, { status: 201, statusText: 'Created' });
  });

  it('PDF renomeado para .jpg: o 400 do BFF aparece sem perder os outros campos', async () => {
    const { el, comp, http, fixture } = await montar();
    preencher(comp);
    comp.avatar.set(arquivo('foto.jpg', 'image/jpeg'));
    comp.salvar();
    http.expectOne(URL).flush({ message: 'O arquivo não é uma imagem PNG, JPG ou WebP válida.' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('O arquivo não é uma imagem PNG, JPG ou WebP válida.');
    expect((el.querySelector('input[name=autor]') as HTMLInputElement).value).toBe('Pessoa Fictícia de QA');
    expect((el.querySelector('input[name=empresa]') as HTMLInputElement).value).toBe('Empresa Exemplo Fictícia');
    expect((el.querySelector('textarea[name=relato]') as HTMLTextAreaElement).value).toContain('Depoimento fictício de QA');
  });

  it('salvar depoimento fictício Oculto: POST com company e role separados, ativo=false, toast e continua Oculto', async () => {
    const { el, comp, http, fixture } = await montar();
    preencher(comp);
    comp.salvar();

    const req = http.expectOne(URL);
    const corpo = req.request.body as FormData;
    expect(req.request.method).toBe('POST');
    expect(corpo.get('author')).toBe('Pessoa Fictícia de QA');
    expect(corpo.get('company')).toBe('Empresa Exemplo Fictícia');
    expect(corpo.get('role')).toBe('Gerente de Marketing');
    expect(corpo.get('ativo')).toBe('false');
    expect(corpo.has('displayOrder')).toBe(false);
    req.flush({ item: cmsDepoimentoDetalheReal(), avisos: [] }, { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    expect(el.querySelector('.mkf-toast')?.textContent).toContain('O site é atualizado em até 5 minutos.');
    expect(el.querySelector('.mkf-pill')?.textContent?.trim()).toBe('Oculto');
  });

  it('edição carrega company/role null como vazios e faz PUT', async () => {
    const detalhe = { ...cmsDepoimentosListaReal().itens[1] };
    const { el, comp, http, fixture } = await montar(detalhe.id);
    http.expectOne(`${URL}/${detalhe.id}`).flush(detalhe);
    await fixture.whenStable();

    expect(el.textContent).toContain('Editar Depoimento');
    expect((el.querySelector('input[name=empresa]') as HTMLInputElement).value).toBe('');
    expect((el.querySelector('input[name=cargo]') as HTMLInputElement).value).toBe('Diretora Comercial');
    expect((el.querySelector('input[name=ordem]') as HTMLInputElement).value).toBe('2');

    comp.salvar();
    const req = http.expectOne(`${URL}/${detalhe.id}`);
    expect(req.request.method).toBe('PUT');
    expect((req.request.body as FormData).get('company')).toBe('');
    req.flush({ item: detalhe, avisos: [] });
  });
});
