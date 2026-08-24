import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Observable, of, tap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SecureStorage } from '../auth/secure-storage';
import { LoginRequest, LoginResponse, OperadorLogado } from '../models/wl.models';

/**
 * Ciclo de vida da sessão do operador WL: login, dados do autenticado,
 * renovação do JWT e logout.
 *
 * Tudo num serviço só de propósito — as quatro operações mexem no mesmo token,
 * no mesmo `SecureStorage` e no mesmo `environment.tokenKey`. Separar a
 * renovação em um serviço à parte só criaria dois donos para o mesmo estado.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private jwtHelper = inject(JwtHelperService);

  private readonly base = `${environment.bffUrl}/auth`;

  /** Renova o token se restar menos do que este valor, em minutos. */
  private readonly margemRefreshMinutos = 10;

  /**
   * `POST /api/wl/auth/login`. Em caso de sucesso o token já é persistido
   * criptografado (ADR-WL-007) para que o `jwtInterceptor` o encontre na
   * próxima chamada.
   */
  login(credenciais: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.base}/login`, credenciais)
      .pipe(tap((resposta) => SecureStorage.setToken(environment.tokenKey, resposta.token)));
  }

  me(): Observable<OperadorLogado> {
    return this.http.get<OperadorLogado>(`${this.base}/me`);
  }

  logout(): void {
    SecureStorage.clear(environment.tokenKey);
  }

  estaAutenticado(): boolean {
    return !!SecureStorage.getToken(environment.tokenKey);
  }

  /**
   * Garante um token utilizável para a navegação atual — consumido pelo
   * `authGuard`.
   *
   * Retorna `true` quando o token está válido, com folga ou recém-renovado, e
   * `false` quando não há token, ele já expirou, ou a renovação foi recusada
   * (operador excluído, sessão revogada).
   *
   * ⚠️ A renovação é **proativa**: acontece enquanto ainda resta margem, nunca
   * depois que o token morreu. `POST /auth/refresh` é `[Authorize]` no BFF, e
   * um token expirado é recusado com 401 antes de chegar ao controller —
   * tentar renovar nesse ponto é uma requisição que falha sempre.
   *
   * Efeito colateral útil: o endpoint relê as permissões do banco, então uma
   * permissão revogada durante a sessão passa a valer na renovação seguinte em
   * vez de sobreviver até a expiração do token.
   */
  garantirTokenValido(): Observable<boolean> {
    const tokenKey = environment.tokenKey;
    const token = SecureStorage.getToken(tokenKey);

    if (!token) {
      return of(false);
    }

    if (this.jwtHelper.isTokenExpired(token)) {
      SecureStorage.clear(tokenKey);
      return of(false);
    }

    // Ainda tem folga suficiente — nenhuma chamada de rede.
    if (!this.expiraEmBreve(token)) {
      return of(true);
    }

    return this.http.post<LoginResponse>(`${this.base}/refresh`, {}).pipe(
      tap((resposta) => SecureStorage.setToken(tokenKey, resposta.token)),
      map(() => true),
      catchError(() => {
        SecureStorage.clear(tokenKey);
        return of(false);
      })
    );
  }

  private expiraEmBreve(token: string): boolean {
    try {
      const expiraEm = this.jwtHelper.getTokenExpirationDate(token);
      if (!expiraEm) return true;

      const minutosRestantes = (expiraEm.getTime() - Date.now()) / 1000 / 60;
      return minutosRestantes < this.margemRefreshMinutos;
    } catch {
      return true;
    }
  }
}
