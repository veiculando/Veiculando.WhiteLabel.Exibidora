import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SecureStorage } from '../auth/secure-storage';

/**
 * Trata centralmente as duas respostas de autorizacao do BFF (diretriz 5 do TP-R4).
 *
 *  - **401** o token expirou ou nunca foi valido: limpa o storage e volta ao login.
 *  - **403** o token e valido mas falta a policy no servidor. Isso passa a
 *    acontecer de fato quando a Tarefa 1 do TP-R2 decorar os endpoints; hoje os
 *    controllers usam `[Authorize]` generico. O `authGuard` ja barra a navegacao
 *    pelo menu, mas uma chamada pode escapar (deep link, token trocado, permissao
 *    revogada durante a sessao) — nesse caso a UI vai para /acesso-negado em vez
 *    de quebrar silenciosamente.
 *
 * O erro e reemitido: o interceptor decide a navegacao, o componente decide a
 * mensagem. Sem isso as telas nunca sairiam do estado "carregando".
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((erro: unknown) => {
      if (erro instanceof HttpErrorResponse) {
        // O proprio login devolve 401 em credencial errada; ali o redirect
        // seria um loop e a tela precisa mostrar "Credenciais invalidas".
        const ehLogin = req.url.includes('/auth/login');

        if (erro.status === 401 && !ehLogin) {
          SecureStorage.clear(environment.tokenKey);
          router.navigate(['/login']);
        }

        if (erro.status === 403) {
          router.navigate(['/acesso-negado']);
        }
      }

      return throwError(() => erro);
    })
  );
};
