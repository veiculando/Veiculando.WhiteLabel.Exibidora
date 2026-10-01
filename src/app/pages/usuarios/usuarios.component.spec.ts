import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrandingService } from '../../core/branding/branding.service';
import { environment } from '../../../environments/environment';
import { UsuariosComponent } from './usuarios.component';

describe('UsuariosComponent — convites', () => {
  const base = `${environment.bffUrl}/usuarios`;
  const pendente = { id: 15, nome: 'Operador QA', email: 'qa@example.com', permissoes: [], statusConvite: 'Pendente' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuariosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('mostra excluídos somente após selecionar o filtro e os mantém sem ações', () => {
    const fixture = TestBed.createComponent(UsuariosComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(base).flush([pendente]);
    fixture.detectChanges();
    const filtro = fixture.nativeElement.querySelector('#mostrar-excluidos') as HTMLInputElement;
    expect(filtro).not.toBeNull();
    expect(filtro.checked).toBe(false);
    filtro.click();
    fixture.detectChanges();
    expect(filtro.disabled).toBe(true);
    http.expectOne(`${base}?incluirExcluidos=true`).flush([
      pendente,
      { ...pendente, id: 17, nome: 'Operador excluído QA', excluido: true, dataExclusao: '2026-08-28T12:00:00Z' },
    ]);
    fixture.detectChanges();
    const row = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr'))
      .find(r => r.textContent?.includes('Operador excluído QA'))!;
    expect(row.textContent).toContain('Excluído');
    expect(row.textContent).toContain('28/08/2026');
    expect(row.textContent).toContain('Somente consulta');
    expect(row.textContent).not.toContain('Convite pendente');
    expect(row.querySelectorAll('button').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('e-mail permanece reservado');
    filtro.click();
    http.expectOne(base).flush([pendente]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Operador excluído QA');
  });

  it('mantém o filtro ao excluir e recarrega o registro como somente consulta', () => {
    const fixture = TestBed.createComponent(UsuariosComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(base).flush([pendente]);
    fixture.detectChanges();
    const filtro = fixture.nativeElement.querySelector('#mostrar-excluidos') as HTMLInputElement;
    expect(filtro).not.toBeNull();
    filtro.click();
    http.expectOne(`${base}?incluirExcluidos=true`).flush([pendente]);
    fixture.detectChanges();
    const confirmacao = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const excluir = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(b => b.textContent?.trim() === 'Excluir')!;
    excluir.click();
    http.expectOne(`${base}/15`).flush(null);
    http.expectOne(`${base}?incluirExcluidos=true`).flush([{ ...pendente, excluido: true, dataExclusao: '2026-08-28T12:00:00Z' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Somente consulta');
    expect(fixture.nativeElement.textContent).toContain('Operador QA');
    confirmacao.mockRestore();
  });

  it('falha no filtro não exibe lista antiga e oferece nova tentativa no mesmo filtro', () => {
    const fixture = TestBed.createComponent(UsuariosComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(base).flush([pendente]);
    fixture.detectChanges();
    const filtro = fixture.nativeElement.querySelector('#mostrar-excluidos') as HTMLInputElement;
    expect(filtro).not.toBeNull();
    filtro.click();
    http.expectOne(`${base}?incluirExcluidos=true`).flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    expect(filtro.disabled).toBe(false);
    const retry = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(b => b.textContent?.includes('Tentar novamente'))!;
    expect(retry).toBeDefined();
    retry.click();
    http.expectOne(`${base}?incluirExcluidos=true`).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhum operador cadastrado');
  });

  it('oferece reenvio somente para pendente, bloqueia duplo envio e confirma após resposta', () => {
    const fixture = TestBed.createComponent(UsuariosComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(base).flush([pendente, { ...pendente, id: 16, statusConvite: 'Aceito' }]);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .filter(b => b.textContent?.includes('Reenviar convite'));
    expect(buttons.length).toBe(1);
    buttons[0].click();
    fixture.detectChanges();
    expect(buttons[0].disabled).toBe(true);
    expect(fixture.componentInstance.aviso).toBeNull();
    const request = http.expectOne(`${base}/15/reenviar-convite`);
    expect(request.request.method).toBe('POST');
    request.flush({ message: 'Novo convite enviado.' });
    http.expectOne(base).flush([pendente]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Novo convite enviado.');
  });

  it('falha de e-mail na criação recarrega o pendente sem afirmar sucesso nem permitir duplicar', () => {
    const fixture = TestBed.createComponent(UsuariosComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(base).flush([]);
    fixture.componentInstance.abrirCriacao();
    fixture.componentInstance.formCriacao.patchValue({ nome: pendente.nome, email: pendente.email });
    fixture.componentInstance.criar();
    const request = http.expectOne(base);
    expect(request.request.body.senha).toBeUndefined();
    request.flush({ id: 15, conviteEnviado: false, message: 'Operador cadastrado, mas o convite não foi enviado.' },
      { status: 503, statusText: 'Service Unavailable' });
    http.expectOne(base).flush([pendente]);
    fixture.detectChanges();
    expect(fixture.componentInstance.criando).toBe(false);
    expect(fixture.componentInstance.aviso).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('convite não foi enviado');
    expect(fixture.nativeElement.textContent).toContain('Reenviar convite');
  });
});

describe('UsuariosComponent — ConteudoGerenciar (VEI-RD-106)', () => {
  const base = `${environment.bffUrl}/usuarios`;
  const marketing = {
    id: 21, nome: 'Marketing QA', email: 'mkt@example.com', statusConvite: 'Aceito',
    permissoes: ['UsuarioAfiliadaGerenciar', 'ConteudoGerenciar'],
  };

  function configurar(cmsHabilitado: boolean | undefined): void {
    TestBed.configureTestingModule({
      imports: [UsuariosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: BrandingService,
          useValue: { branding: signal({ nomeExibicao: 'Aurum', cmsHabilitado }) },
        },
      ],
    });
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function opcaoConteudo(raiz: HTMLElement): HTMLInputElement | null {
    const label = Array.from(raiz.querySelectorAll('label.permissao'))
      .find((l) => l.querySelector('code')?.textContent === 'ConteudoGerenciar');
    return label?.querySelector('input[type="checkbox"]') ?? null;
  }

  // Estado montado antes da única detectChanges; o que vem do HTTP é lido
  // depois de whenStable (scheduler coalescido do Angular 22).
  async function abrirCriacao(usuarios: unknown[]) {
    const fixture = TestBed.createComponent(UsuariosComponent);
    fixture.componentInstance.abrirCriacao();
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(base).flush(usuarios);
    await fixture.whenStable();
    return fixture;
  }

  it('com CMS habilitado, oferece a permissão com o rótulo e a concede na criação', async () => {
    configurar(true);
    const http = TestBed.inject(HttpTestingController);
    const fixture = await abrirCriacao([]);
    const raiz = fixture.nativeElement as HTMLElement;

    const opcao = opcaoConteudo(raiz);
    expect(opcao).not.toBeNull();
    expect(opcao!.closest('label')!.textContent).toContain('Gerenciar conteúdo do site');

    opcao!.click();
    fixture.componentInstance.formCriacao.patchValue({ nome: 'Marketing QA', email: 'mkt@example.com' });
    fixture.componentInstance.criar();

    const request = http.expectOne(base);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.permissoes).toEqual(['ConteudoGerenciar']);
    request.flush({ id: 21, message: 'Operador cadastrado.' });
    http.expectOne(base).flush([marketing]);
    await fixture.whenStable();
  });

  it.each([false, undefined])('com cmsHabilitado %s, não oferece a permissão', async (cms) => {
    configurar(cms);
    const fixture = await abrirCriacao([]);
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.textContent).toContain('Gerenciar operadores');
    expect(opcaoConteudo(raiz)).toBeNull();
    expect(fixture.componentInstance.permissoes()).not.toContain('ConteudoGerenciar');
  });

  it('com CMS habilitado, revoga a permissão pela edição', async () => {
    configurar(true);
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(UsuariosComponent);
    fixture.detectChanges();
    http.expectOne(base).flush([marketing]);
    await fixture.whenStable();

    fixture.componentInstance.abrirEdicao(marketing as never);
    fixture.detectChanges();
    await fixture.whenStable();
    const edicao = (fixture.nativeElement as HTMLElement).querySelectorAll('fieldset.permissoes');
    const opcao = opcaoConteudo(edicao[edicao.length - 1] as HTMLElement);
    expect(opcao).not.toBeNull();
    expect(opcao!.checked).toBe(true);

    opcao!.click();
    fixture.componentInstance.salvarEdicao(marketing as never);

    const request = http.expectOne(`${base}/21`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.permissoes).toEqual(['UsuarioAfiliadaGerenciar']);
    request.flush({ message: 'Operador atualizado.' });
    http.expectOne(base).flush([{ ...marketing, permissoes: ['UsuarioAfiliadaGerenciar'] }]);
    await fixture.whenStable();
  });

  it('sem CMS, editar quem já tem a permissão não a revoga em silêncio', async () => {
    configurar(false);
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(UsuariosComponent);
    fixture.detectChanges();
    http.expectOne(base).flush([marketing]);
    await fixture.whenStable();

    fixture.componentInstance.abrirEdicao(marketing as never);
    fixture.componentInstance.salvarEdicao(marketing as never);

    const request = http.expectOne(`${base}/21`);
    expect(request.request.body.permissoes).toEqual(['UsuarioAfiliadaGerenciar', 'ConteudoGerenciar']);
    request.flush({ message: 'Operador atualizado.' });
    http.expectOne(base).flush([marketing]);
    await fixture.whenStable();
  });
});
