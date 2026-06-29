import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { SecureStorage } from './secure-storage';
import { environment } from '../../../environments/environment';

/**
 * AuthGuard da Exibidora WL com suporte a permissões granulares.
 *
 * Fluxo:
 * 1. Descriptografa o JWT do localStorage (chave: veiculando-wl-op.token)
 * 2. Valida se o token existe e não está expirado
 * 3. Se a rota definir `data.permission`, verifica se o JWT contém a claim
 *    "permission" com aquele valor (ex: 'FinanceiroVisualizar')
 * 4. Se não autorizado, redireciona para /acesso-negado (permissão) ou /login (sem token)
 *
 * Claims emitidas pelo BFF (AuthController.BuildPermissionClaims):
 *  - "permission": "PecaGerenciar"
 *  - "permission": "PedidoReservaGerenciar"
 *  - "permission": "FinanceiroVisualizar"
 *  - "permission": "ClienteGerenciar"
 */
export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const jwtHelper = inject(JwtHelperService);

  const tokenKey = environment.tokenKey; // 'veiculando-wl-op.token'
  const token = SecureStorage.getToken(tokenKey);

  // 1. Sem token ou token expirado → login
  if (!token || jwtHelper.isTokenExpired(token)) {
    SecureStorage.clear(tokenKey);
    router.navigate(['/login']);
    return false;
  }

  // 2. Verifica permissão granular se a rota a exige
  const requiredPermission: string | undefined = route.data?.['permission'];

  if (requiredPermission) {
    const decodedToken = jwtHelper.decodeToken(token);
    const hasPermission = hasRequiredPermission(decodedToken, requiredPermission);

    if (!hasPermission) {
      // Token válido, mas sem permissão para esta rota
      router.navigate(['/acesso-negado']);
      return false;
    }
  }

  return true;
};

/**
 * Verifica se o payload do JWT contém a permissão requerida.
 *
 * O BFF emite múltiplas claims com chave "permission".
 * A biblioteca jwt-decode retorna essas claims como:
 *   - string única: permission = "PecaGerenciar"
 *   - ou array: permission = ["PecaGerenciar", "FinanceiroVisualizar"]
 */
function hasRequiredPermission(decodedToken: Record<string, unknown>, requiredPermission: string): boolean {
  if (!decodedToken) return false;

  const permissionClaim = decodedToken['permission'];

  if (Array.isArray(permissionClaim)) {
    return permissionClaim.includes(requiredPermission);
  }

  if (typeof permissionClaim === 'string') {
    return permissionClaim === requiredPermission;
  }

  return false;
}
