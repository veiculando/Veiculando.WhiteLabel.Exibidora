import { Injectable, inject } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { SecureStorage } from './secure-storage';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private jwtHelper = inject(JwtHelperService);

  /**
   * Claims do token de sessão, ou `null` se não há token utilizável.
   *
   * `isTokenExpired` precisa estar DENTRO do try. Ele lança
   * `"The inspected token doesn't appear to be a JWT"` quando o valor não tem
   * três partes — e estava fora da guarda, com só o `decodeToken` protegido.
   *
   * O caminho é real: `SecureStorage.getToken` decifra o que estiver no
   * localStorage, e um valor corrompido (storage adulterado, resto de outra
   * versão do app) às vezes decifra para uma string não-vazia que não é um JWT.
   * Aí `has()` lançava em vez de devolver `false`, e a exceção sobe no
   * `authGuard` e na renderização do menu — o painel quebra em branco por causa
   * de um resto no storage do visitante.
   */
  private getDecodedToken(): Record<string, any> | null {
    const token = SecureStorage.getToken(environment.tokenKey);
    if (!token) return null;

    try {
      if (this.jwtHelper.isTokenExpired(token)) return null;
      return this.jwtHelper.decodeToken(token);
    } catch {
      return null;
    }
  }

  /**
   * Verifica se o operador autenticado possui a permissão especificada.
   *
   * Suporta claim única (string) ou múltiplas claims (array), que é como o
   * `AuthController` as emite — uma claim `permission` por permissão.
   *
   * Não há wildcard. Havia um tratamento de `'*'` aqui que concedia tudo, mas
   * `'*'` não existe em `WlPermissoesValidas` (o domínio recusa o valor no
   * cadastro) nem nas policies do BFF, que exigem `RequireClaim` com o nome
   * exato da permissão. Um token com `'*'` liberaria o menu e as rotas inteiras
   * no cliente enquanto toda chamada de escrita voltaria 403 — o operador veria
   * a tela abrir e a ação falhar. Melhor não ter o conceito dos dois lados.
   */
  has(perm: string): boolean {
    const decoded = this.getDecodedToken();
    if (!decoded) return false;

    const permissionClaim = decoded['permission'];

    if (Array.isArray(permissionClaim)) {
      return permissionClaim.includes(perm);
    }

    if (typeof permissionClaim === 'string') {
      return permissionClaim === perm;
    }

    return false;
  }

  /**
   * Retorna o nome do operador autenticado contido nas claims do JWT.
   */
  getOperatorName(): string {
    const decoded = this.getDecodedToken();
    if (!decoded) return 'Operador WL';

    return (
      decoded['name'] ||
      decoded['unique_name'] ||
      decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
      decoded['sub'] ||
      'Operador WL'
    );
  }
}
