import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
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
