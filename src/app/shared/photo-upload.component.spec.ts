import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient, HttpEventType } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PhotoUploadComponent, FotoPersistida } from './photo-upload.component';

describe('PhotoUploadComponent', () => {
  let fixture: ComponentFixture<PhotoUploadComponent>;
  let http: HttpTestingController;
  const url = '/api/wl/checking/enviar-foto/1';
  const list = '/api/wl/checking/item/1/fotos';
  const photo: FotoPersistida = { fileName: 'foto.png', contentType: 'image/png', size: 20, sha256: 'abc', createdAt: '2026-08-27T10:00:00Z', downloadUrl: '/api/wl/checking/item/1/fotos/2/arquivo' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PhotoUploadComponent], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PhotoUploadComponent);
    fixture.componentRef.setInput('uploadUrl', url);
    fixture.componentRef.setInput('listUrl', list);
    fixture.detectChanges();
    http.expectOne(list).flush([]);
  });
  afterEach(() => http.verify());

  function choose(file = new File(['imagem'], 'foto.png', { type: 'image/png' })): void {
    fixture.componentInstance.selecionar({ target: { files: [file] } } as unknown as Event);
  }

  it('envia multipart, mostra progresso e só confirma após releitura com o arquivo salvo', () => {
    choose();
    fixture.componentInstance.enviar();
    fixture.componentInstance.enviar();
    const req = http.expectOne(url);
    expect(req.request.body instanceof FormData).toBe(true);
    expect(req.request.body.has('afiliadaId')).toBe(false);
    req.event({ type: HttpEventType.UploadProgress, loaded: 3, total: 6 });
    expect(fixture.componentInstance.progresso()).toBe(50);
    req.flush({ fileName: photo.fileName });
    expect(fixture.componentInstance.sucesso()).toBe('');
    http.expectOne(list).flush([photo]);
    expect(fixture.componentInstance.sucesso()).toContain('salva e conferida');
    expect(fixture.componentInstance.enviando()).toBe(false);
    expect(fixture.componentInstance.fotos()).toEqual([photo]);
  });

  it('não inventa sucesso quando o servidor retorna 2xx sem foto persistida', () => {
    choose(); fixture.componentInstance.enviar();
    http.expectOne(url).flush({ fileName: photo.fileName });
    http.expectOne(list).flush([]);
    expect(fixture.componentInstance.sucesso()).toBe('');
    expect(fixture.componentInstance.erro()).toContain('não apareceu');
  });

  it('preserva seleção e permite retry após falha', () => {
    choose(); fixture.componentInstance.enviar();
    http.expectOne(url).flush({ message: 'Não foi possível confirmar o arquivo.' }, { status: 503, statusText: 'Unavailable' });
    expect(fixture.componentInstance.enviando()).toBe(false);
    expect(fixture.componentInstance.selecionada()).not.toBeNull();
    fixture.componentInstance.enviar();
    http.expectOne(url).flush({ fileName: photo.fileName });
    http.expectOne(list).flush([photo]);
  });

  it.each([
    new File(['pdf'], 'documento.pdf', { type: 'application/pdf' }),
    new File([], 'vazio.png', { type: 'image/png' }),
    new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' }),
  ])('recusa arquivo incompatível antes do POST', file => {
    choose(file); fixture.componentInstance.enviar();
    http.expectNone(url);
    expect(fixture.componentInstance.erro()).toContain('JPG ou PNG');
  });

  it('recarrega os arquivos persistidos e faz download autenticado pelo BFF', () => {
    fixture.componentInstance.carregar();
    http.expectOne(list).flush([photo]);
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    fixture.componentInstance.baixar(photo);
    const download = http.expectOne(photo.downloadUrl);
    expect(download.request.responseType).toBe('blob');
    download.flush(new Blob(['imagem']));
    expect(click).toHaveBeenCalled();
    create.mockRestore(); click.mockRestore();
  });

  it('não envia credenciais para download em domínio externo', () => {
    fixture.componentInstance.baixar({ ...photo, downloadUrl: 'https://outro.exemplo/arquivo' });
    http.expectNone('https://outro.exemplo/arquivo');
    expect(fixture.componentInstance.erro()).toContain('inválida');
  });
});
