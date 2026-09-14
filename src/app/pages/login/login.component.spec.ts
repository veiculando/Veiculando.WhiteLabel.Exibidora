import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { LoginComponent } from './login.component';
import { EsqueciSenhaComponent } from './esqueci-senha.component';
import { environment } from '../../../environments/environment';

/**
 * Telas de login e recuperacao — cards `8d8b9325` e `4a1da2a2`, item 2 do
 * roteiro de validacao visual.
 *
 * O backend ja e coberto por `RecuperacaoSenhaTests` e `AutenticacaoTests`. O
 * que nao tinha teste era o lado do painel, incluindo a propriedade que mais
 * importa aqui: a tela **nao** pode inventar texto proprio no esqueci-senha, ou
 * a resposta deixaria de ser indistinguivel entre e-mail existente e
 * inexistente — que e todo o ponto do cenario 1 do card.
 */
describe('LoginComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: JWT_OPTIONS, useValue: {} },
        JwtHelperService,
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function criar(): LoginComponent {
    return TestBed.createComponent(LoginComponent).componentInstance;
  }

  it('formulario invalido nao chama o BFF', () => {
    const componente = criar();

    componente.form.setValue({ email: 'nao-e-email', senha: '' });
    componente.entrar();

    expect(componente.enviando).toBe(false);
    expect(componente.form.controls.email.touched).toBe(true);
    // Nenhuma requisicao: o verify() do afterEach cobra.
  });

  it('login valido posta credenciais e navega para o dashboard', () => {
    const componente = criar();
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    componente.form.setValue({ email: 'op@exemplo.com', senha: 'SenhaValida123' });
    componente.entrar();

    const req = httpMock.expectOne(`${environment.bffUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'op@exemplo.com', senha: 'SenhaValida123' });
    // O tenant vem do Host — a tela nao escolhe afiliada.
    expect(req.request.body).not.toHaveProperty('afiliadaId');

    req.flush({ token: 'jwt.de.teste', permissoes: [] });

    expect(navegar).toHaveBeenCalledWith(['/dashboard']);
    expect(componente.enviando).toBe(false);
  });

  it('senha errada vira mensagem generica e libera o botao', () => {
    const componente = criar();

    componente.form.setValue({ email: 'op@exemplo.com', senha: 'errada' });
    componente.entrar();

    httpMock
      .expectOne(`${environment.bffUrl}/auth/login`)
      .flush({ message: 'Credenciais inválidas.' }, { status: 401, statusText: 'Unauthorized' });

    expect(componente.erro).toBeTruthy();
    expect(componente.enviando).toBe(false);
  });
});

describe('EsqueciSenhaComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: JWT_OPTIONS, useValue: {} },
        JwtHelperService,
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function criar(): EsqueciSenhaComponent {
    return TestBed.createComponent(EsqueciSenhaComponent).componentInstance;
  }

  it('e-mail invalido nao chama o BFF', () => {
    const componente = criar();

    componente.form.setValue({ email: 'sem-arroba' });
    componente.enviar();

    expect(componente.enviando).toBe(false);
  });

  /**
   * Cenario 1 do card `8d8b9325` no lado da UI.
   *
   * A tela exibe `resposta.message` cru, sem texto proprio. Se alguem trocar
   * isso por uma string client-side — "enviamos para o seu e-mail" — a
   * indistinguibilidade se perde no momento em que o BFF variar a mensagem, e o
   * painel passa a ser o oraculo que o backend evita ser.
   */
  it('exibe a mensagem do BFF sem substitui-la por texto proprio', () => {
    const componente = criar();
    const generica = 'Se o e-mail existir, enviaremos as instruções.';

    componente.form.setValue({ email: 'existe@exemplo.com' });
    componente.enviar();

    const req = httpMock.expectOne(`${environment.bffUrl}/auth/esqueci-senha`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: generica });

    expect(componente.mensagemSucesso).toBe(generica);
    expect(componente.erro).toBeNull();
  });

  it('e-mail inexistente produz exatamente o mesmo estado de tela', () => {
    const componente = criar();
    const generica = 'Se o e-mail existir, enviaremos as instruções.';

    componente.form.setValue({ email: 'naoexiste@exemplo.com' });
    componente.enviar();

    httpMock.expectOne(`${environment.bffUrl}/auth/esqueci-senha`).flush({ message: generica });

    expect(componente.mensagemSucesso).toBe(generica);
    expect(componente.erro).toBeNull();
  });

  it('rate limit do BFF vira erro sem revelar se o e-mail existe', () => {
    const componente = criar();

    componente.form.setValue({ email: 'existe@exemplo.com' });
    componente.enviar();

    httpMock
      .expectOne(`${environment.bffUrl}/auth/esqueci-senha`)
      .flush(null, { status: 429, statusText: 'Too Many Requests' });

    expect(componente.erro).toBeTruthy();
    expect(componente.mensagemSucesso).toBeNull();
  });
});
