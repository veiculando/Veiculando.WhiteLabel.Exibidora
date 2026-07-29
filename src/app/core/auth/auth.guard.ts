import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { SecureStorage } from './secure-storage';
import { PermissionService } from './permission.service';
import { environment } from '../../../environments/environment';

/**
 * AuthGuard da Exibidora WL com suporte a permissões granulares.
 *
 * Fluxo:
 * 1. Descriptografa o JWT do localStorage (chave: veiculando-wl-op.token)
 * 2. Valida se o token existe e não está expirado
 * 3. Se a rota definir `data.permission`, verifica se o JWT contém a claim via PermissionService
 * 4. Se não autorizado, redireciona para /acesso-negado (permissão) ou /login (sem token)
 */
export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const jwtHelper = inject(JwtHelperService);
  const permissionService = inject(PermissionService);

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

  if (requiredPermission && !permissionService.has(requiredPermission)) {
    // Token válido, mas sem permissão para esta rota
    router.navigate(['/acesso-negado']);
    return false;
  }

  return true;
};

