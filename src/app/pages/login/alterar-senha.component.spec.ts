import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { AlterarSenhaComponent } from './alterar-senha.component';
import { environment } from '../../../environments/environment';

/**
 * Redefinicao de senha e primeiro acesso — cards `8d8b9325` e `d5e7b429`,
 * item 2 do roteiro de validacao visual.
 *
 * O mesmo componente serve os dois fluxos, decidindo pelo `data.primeiroAcesso`
 * da rota. Errar essa bifurcacao manda o convite para o endpoint de recuperacao
 * (e vice-versa), o que so aparece como "link invalido" na tela — sintoma que
 * nao aponta para a causa. Dai o teste ser por endpoint chamado.
 */
describe('AlterarSenhaComponent', () => {
  let httpMock: HttpTestingController;

  function configurar(
    params: Record<string, string>,
    data: Record<string, unknown> = {}
  ): AlterarSenhaComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: JWT_OPTIONS, useValue: {} },
        JwtHelperService,
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(params), data } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);

    return TestBed.createComponent(AlterarSenhaComponent).componentInstance;
  }

  afterEach(() => httpMock.verify());

  it('link sem email ou token e marcado como invalido e nao mostra formulario', () => {
    expect(configurar({}).linkInvalido).toBe(true);
    expect(configurar({ email: 'op@exemplo.com' }).linkInvalido).toBe(true);
    expect(configurar({ token: 'abc' }).linkInvalido).toBe(true);
  });

  it('link completo habilita o formulario', () => {
    const componente = configurar({ email: 'op@exemplo.com', token: 'abc' });
    expect(componente.linkInvalido).toBe(false);
  });

  it('senhas diferentes nao chamam o BFF', () => {
    const componente = configurar({ email: 'op@exemplo.com', token: 'abc' });

    componente.form.setValue({ novaSenha: 'SenhaValida123', confirmarSenha: 'Outra123456' });
    componente.enviar();

    expect(componente.mostrarErroConfirmacao()).toBe(true);
    expect(componente.enviando).toBe(false);
  });

  it('senha abaixo do minimo nao chama o BFF', () => {
    const componente = configurar({ email: 'op@exemplo.com', token: 'abc' });

    componente.form.setValue({ novaSenha: 'curta', confirmarSenha: 'curta' });
    componente.enviar();

    expect(componente.enviando).toBe(false);
  });

  it('recuperacao posta em /auth/alterar-senha com o token da URL', () => {
    const componente = configurar({ email: 'op@exemplo.com', token: 'tok-123' });

    componente.form.setValue({ novaSenha: 'SenhaValida123', confirmarSenha: 'SenhaValida123' });
    componente.enviar();

    const req = httpMock.expectOne(`${environment.bffUrl}/auth/alterar-senha`);
    expect(req.request.body).toEqual({
      email: 'op@exemplo.com',
      token: 'tok-123',
      novaSenha: 'SenhaValida123',
    });
    req.flush({ message: 'Senha alterada com sucesso.' });

    expect(componente.mensagemSucesso).toBe('Senha alterada com sucesso.');
  });

  it('primeiro acesso posta em /auth/primeiro-acesso, nao no de recuperacao', () => {
    const componente = configurar(
      { email: 'novo@exemplo.com', token: 'convite-1' },
      { primeiroAcesso: true }
    );

    expect(componente.primeiroAcesso).toBe(true);

    componente.form.setValue({ novaSenha: 'SenhaValida123', confirmarSenha: 'SenhaValida123' });
    componente.enviar();

    const req = httpMock.expectOne(`${environment.bffUrl}/auth/primeiro-acesso`);
    expect(req.request.body.token).toBe('convite-1');
    req.flush({ message: 'Acesso criado com sucesso.' });

    expect(componente.mensagemSucesso).toBe('Acesso criado com sucesso.');
  });

  /**
   * ADR-WL-007 trata do JWT de sessao; este token de uso unico nao deve tocar
   * storage em momento algum. Se alguem "melhorar" a tela guardando o token
   * para reenvio, este teste pega.
   */
  it('o token de uso unico nunca e persistido em storage', () => {
    localStorage.clear();
    const componente = configurar({ email: 'op@exemplo.com', token: 'segredo-abc' });

    componente.form.setValue({ novaSenha: 'SenhaValida123', confirmarSenha: 'SenhaValida123' });
    componente.enviar();

    httpMock
      .expectOne(`${environment.bffUrl}/auth/alterar-senha`)
      .flush({ message: 'Senha alterada com sucesso.' });

    const tudo = JSON.stringify(localStorage);
    expect(tudo).not.toContain('segredo-abc');
    localStorage.clear();
  });

  it('token expirado vira mensagem propria da tela, nao o corpo cru do erro', () => {
    const componente = configurar({ email: 'op@exemplo.com', token: 'expirado' });

    componente.form.setValue({ novaSenha: 'SenhaValida123', confirmarSenha: 'SenhaValida123' });
    componente.enviar();

    httpMock
      .expectOne(`${environment.bffUrl}/auth/alterar-senha`)
      .flush(null, { status: 400, statusText: 'Bad Request' });

    expect(componente.erro).toContain('Link de recuperação inválido');
    expect(componente.enviando).toBe(false);
  });

  it('convite invalido no primeiro acesso tem mensagem propria daquele fluxo', () => {
    const componente = configurar(
      { email: 'novo@exemplo.com', token: 'usado' },
      { primeiroAcesso: true }
    );

    componente.form.setValue({ novaSenha: 'SenhaValida123', confirmarSenha: 'SenhaValida123' });
    componente.enviar();

    httpMock
      .expectOne(`${environment.bffUrl}/auth/primeiro-acesso`)
      .flush(null, { status: 400, statusText: 'Bad Request' });

    expect(componente.erro).toContain('Convite inválido');
  });
});
