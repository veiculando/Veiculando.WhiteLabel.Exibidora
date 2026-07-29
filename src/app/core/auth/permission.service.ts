import { Injectable, inject } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { SecureStorage } from './secure-storage';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private jwtHelper = inject(JwtHelperService);

  private getDecodedToken(): Record<string, any> | null {
    const tokenKey = environment.tokenKey;
    const token = SecureStorage.getToken(tokenKey);
    if (!token || this.jwtHelper.isTokenExpired(token)) {
      return null;
    }
    try {
      return this.jwtHelper.decodeToken(token);
    } catch {
      return null;
    }
  }

  /**
   * Verifica se o operador autenticado possui a permissão especificada.
   * Suporta claim única (string) ou múltiplas claims (array de strings), além de wildcard ('*').
   */
  has(perm: string): boolean {
    const decoded = this.getDecodedToken();
    if (!decoded) return false;

    const permissionClaim = decoded['permission'];

    if (Array.isArray(permissionClaim)) {
      return permissionClaim.includes(perm) || permissionClaim.includes('*');
    }

    if (typeof permissionClaim === 'string') {
      return permissionClaim === perm || permissionClaim === '*';
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
