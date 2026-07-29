import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SecureStorage } from '../auth/secure-storage';
import { LoginRequest, LoginResponse, OperadorLogado } from '../models/wl.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/auth`;

  /**
   * `POST /api/wl/auth/login`. Em caso de sucesso o token ja e persistido
   * criptografado (ADR-WL-007) para que o `jwtInterceptor` o encontre na
   * proxima chamada.
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
}
