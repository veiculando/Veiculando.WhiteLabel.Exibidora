import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { environment } from '../../../environments/environment';
import { SecureStorage } from '../auth/secure-storage';
import { AuthService } from './auth.service';

function tokenQueExpiraEm(minutos: number): string {
  const exp = Math.floor(Date.now() / 1000) + minutos * 60;
  const base64 = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${base64({ alg: 'none', typ: 'JWT' })}.${base64({ exp })}.assinatura`;
}

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: JWT_OPTIONS, useValue: {} },
        JwtHelperService,
        AuthService,
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('login persiste o token cifrado para o interceptor encontrar', () => {
    service.login({ email: 'a@b.com', senha: 'x' }).subscribe();

    http.expectOne(`${environment.bffUrl}/auth/login`).flush({
      token: 'token-do-bff',
      expiresInMinutes: 60,
      nome: 'Fulano',
      email: 'a@b.com',
      permissoes: [],
    });

    expect(SecureStorage.getToken(environment.tokenKey)).toBe('token-do-bff');
    // Cifrado no storage, nao em texto puro (ADR-WL-007).
    expect(localStorage.getItem(environment.tokenKey)).not.toBe('token-do-bff');
  });

  it('sem token, a sessao e invalida e nao ha chamada de rede', () => {
    let valida: boolean | null = null;
    service.garantirTokenValido().subscribe((v) => (valida = v));

    expect(valida).toBeFalse();
    http.expectNone(`${environment.bffUrl}/auth/refresh`);
  });

  it('token com folga nao dispara refresh', () => {
    SecureStorage.setToken(environment.tokenKey, tokenQueExpiraEm(60));

    let valida: boolean | null = null;
    service.garantirTokenValido().subscribe((v) => (valida = v));

    expect(valida).toBeTrue();
    http.expectNone(`${environment.bffUrl}/auth/refresh`);
  });

  /**
   * A renovacao e PROATIVA: acontece enquanto ainda ha margem, nunca depois que
   * o token morreu. `/auth/refresh` e [Authorize] no BFF — token expirado e
   * recusado com 401 antes de chegar ao controller, entao tentar renovar nesse
   * ponto e uma requisicao que falha sempre.
   */
  it('token perto de expirar dispara refresh e guarda o novo', () => {
    SecureStorage.setToken(environment.tokenKey, tokenQueExpiraEm(5));

    let valida: boolean | null = null;
    service.garantirTokenValido().subscribe((v) => (valida = v));

    http.expectOne(`${environment.bffUrl}/auth/refresh`).flush({
      token: 'token-renovado',
      expiresInMinutes: 60,
      nome: 'Fulano',
      email: 'a@b.com',
      permissoes: ['Checking'],
    });

    expect(valida).toBeTrue();
    expect(SecureStorage.getToken(environment.tokenKey)).toBe('token-renovado');
  });

  it('token ja expirado nao tenta renovar e limpa o storage', () => {
    SecureStorage.setToken(environment.tokenKey, tokenQueExpiraEm(-1));

    let valida: boolean | null = null;
    service.garantirTokenValido().subscribe((v) => (valida = v));

    expect(valida).toBeFalse();
    expect(SecureStorage.getToken(environment.tokenKey)).toBeNull();
    http.expectNone(`${environment.bffUrl}/auth/refresh`);
  });

  it('refresh recusado invalida a sessao — operador excluido durante o uso', () => {
    SecureStorage.setToken(environment.tokenKey, tokenQueExpiraEm(5));

    let valida: boolean | null = null;
    service.garantirTokenValido().subscribe((v) => (valida = v));

    http.expectOne(`${environment.bffUrl}/auth/refresh`)
      .flush({ message: 'Sessão inválida.' }, { status: 401, statusText: 'Unauthorized' });

    expect(valida).toBeFalse();
    expect(SecureStorage.getToken(environment.tokenKey)).toBeNull();
  });

  it('logout limpa o token', () => {
    SecureStorage.setToken(environment.tokenKey, tokenQueExpiraEm(60));

    service.logout();

    expect(SecureStorage.getToken(environment.tokenKey)).toBeNull();
    expect(service.estaAutenticado()).toBeFalse();
  });
});
