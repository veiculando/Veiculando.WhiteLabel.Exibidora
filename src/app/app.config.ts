import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/auth/jwt.interceptor';
import { authErrorInterceptor } from './core/http/auth-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withXhr(), 
      // A ordem importa: o jwtInterceptor precisa anexar o Bearer antes de a
      // requisição sair, e o authErrorInterceptor precisa ver a resposta que
      // volta. Interceptors funcionais são executados em cadeia, então o
      // primeiro da lista é o mais externo no caminho de resposta.
      withInterceptors([authErrorInterceptor, jwtInterceptor])
    ),
    // O JwtHelperService lê `tokenGetter` deste objeto de configuração. Aqui ele
    // não é usado: a Exibidora sempre passa o token explicitamente para
    // `isTokenExpired`/`decodeToken`, porque o valor no localStorage está
    // criptografado (ADR-WL-007) e precisa passar pelo SecureStorage primeiro.
    { provide: JWT_OPTIONS, useValue: {} },
    JwtHelperService,
  ],
};
