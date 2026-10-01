import { TestBed } from '@angular/core/testing';
import { AurumDropzoneComponent } from './aurum-dropzone.component';

const MB = 1024 * 1024;

/** Arquivo com o tamanho declarado sem alocar os bytes. */
function arquivo(nome: string, tipo: string, bytes: number): File {
  const f = new File(['x'], nome, { type: tipo });
  Object.defineProperty(f, 'size', { value: bytes });
  return f;
}

describe('AurumDropzoneComponent', () => {
  async function montar(config: Partial<AurumDropzoneComponent> = {}) {
    const fixture = TestBed.createComponent(AurumDropzoneComponent);
    const comp = fixture.componentInstance;
    Object.assign(comp, config);
    const emitidos: (File | null)[] = [];
    comp.arquivoChange.subscribe((f) => emitidos.push(f));
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return { fixture, comp, emitidos, el: fixture.nativeElement as HTMLElement };
  }

  it('mostra o texto de formato, recomendação e limite', async () => {
    const { el } = await montar({ recomendacao: '1200×600 px' });
    expect(el.textContent).toContain('Clique para enviar ou arraste a imagem');
    expect(el.textContent).toContain('PNG, JPG ou WebP — recomendado 1200×600 px — até 5 MB');
    expect(el.querySelector('input[type=file]')?.getAttribute('accept')).toBe('image/png,image/jpeg,image/webp');
  });

  it('barra tipo inválido (.gif) antes do envio e emite null', async () => {
    const { fixture, comp, emitidos, el } = await montar();
    comp.receber(arquivo('anim.gif', 'image/gif', 1000));
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('Formato não aceito. Envie PNG, JPG ou WebP.');
    expect(emitidos).toEqual([null]);
    expect(comp.arquivo()).toBeNull();
  });

  it('barra arquivo grande demais (imagem de 6 MB com limite de 5 MB)', async () => {
    const { fixture, comp, emitidos, el } = await montar();
    comp.receber(arquivo('grande.png', 'image/png', 6 * MB));
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('passa do limite de 5 MB');
    expect(emitidos).toEqual([null]);
  });

  it('aceita arquivo válido, emite o File e limpa o erro anterior', async () => {
    const { fixture, comp, emitidos, el } = await montar();
    comp.receber(arquivo('anim.gif', 'image/gif', 10));
    const valido = arquivo('banner.webp', 'image/webp', 2 * MB);
    comp.receber(valido);
    await fixture.whenStable();

    expect(emitidos).toEqual([null, valido]);
    expect(el.querySelector('[role=alert]')).toBeNull();
    expect(el.textContent).toContain('banner.webp');
  });

  it('casa por extensão quando o accept declara .html (limite de 2 MB)', async () => {
    const { comp } = await montar({ accept: '.html,text/html', maxBytes: 2 * MB, formatos: 'arquivo .html', imagem: false });
    expect(comp.validar(arquivo('hotsite.html', '', 1000))).toBeNull();
    expect(comp.validar(arquivo('hotsite.html', 'text/html', 2.5 * MB))).toContain('2,5 MB e passa do limite de 2 MB');
    expect(comp.validar(arquivo('hotsite.htm.exe', 'application/x-msdownload', 10))).toContain('Formato não aceito');
  });

  it('o drop do arraste passa pela mesma validação', async () => {
    const { fixture, comp, emitidos } = await montar({ maxBytes: 2 * MB });
    const grande = arquivo('logo.png', 'image/png', 3 * MB);
    const evento = { preventDefault: () => undefined, dataTransfer: { files: [grande] } } as unknown as DragEvent;
    comp.aoSoltar(evento);
    await fixture.whenStable();

    expect(emitidos).toEqual([null]);
    expect(comp.erro()).toContain('passa do limite de 2 MB');
  });

  it('na edição mostra a imagem salva até o operador escolher outra', async () => {
    const { el } = await montar({ previewAtual: 'https://cms-ficticio.supabase.co/x.webp' });
    expect(el.querySelector('img')?.getAttribute('src')).toBe('https://cms-ficticio.supabase.co/x.webp');
  });
});
