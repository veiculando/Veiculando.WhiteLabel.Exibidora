import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SecureStorage } from './secure-storage';

interface RefreshResponse {
  token: string;
  expiresInMinutes: number;
  nome: string;
  email: string;
  permissoes: string[];
}

/**
 * Renovação silenciosa do JWT da Exibidora WL — `POST /api/wl/auth/refresh`.
 *
 * Separado do `AuthService` (em `core/services/`), que cuida de login, `/me` e
 * logout: este aqui é consumido pelo `authGuard` a cada navegação e não deve
 * arrastar o resto do ciclo de autenticação junto.
 *
 * ⚠️ **O refresh só funciona com um token ainda válido.** O endpoint no BFF é
 * `[Authorize]`, então um token já expirado é recusado com 401 antes de chegar
 * ao controller. Por isso a renovação é *proativa*: acontece enquanto ainda
 * resta a margem abaixo, nunca depois que o token morreu. Chamar o refresh com
 * token expirado é uma requisição que falha sempre.
 *
 * Um efeito útil: como o endpoint relê as permissões do banco, uma permissão
 * revogada durante a sessão passa a valer na renovação seguinte, em vez de
 * sobreviver até a expiração do token.
 */
@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
  private http = inject(HttpClient);
  private jwtHelper = inject(JwtHelperService);

  /** Renova o token se restar menos do que este valor, em minutos. */
  private readonly margemRefreshMinutos = 10;

  private readonly refreshUrl = `${environment.bffUrl}/auth/refresh`;

  /**
   * Garante um token utilizável para a navegação atual.
   *
   * Retorna `true` quando o token está válido — com folga ou recém-renovado — e
   * `false` quando não há token, ele já expirou ou a renovação foi recusada
   * (operador excluído, sessão revogada).
   */
  garantirTokenValido(): Observable<boolean> {
    const tokenKey = environment.tokenKey;
    const token = SecureStorage.getToken(tokenKey);

    if (!token) {
      return of(false);
    }

    // Já expirou: não adianta tentar renovar, o endpoint recusaria.
    if (this.jwtHelper.isTokenExpired(token)) {
      SecureStorage.clear(tokenKey);
      return of(false);
    }

    // Ainda tem folga suficiente — nenhuma chamada de rede.
    if (!this.expiraEmBreve(token)) {
      return of(true);
    }

    return this.http.post<RefreshResponse>(this.refreshUrl, {}).pipe(
      tap((res) => SecureStorage.setToken(tokenKey, res.token)),
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
