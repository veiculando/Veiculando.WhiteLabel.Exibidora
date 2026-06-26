import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { SecureStorage } from './secure-storage';
import { environment } from '../../../environments/environment';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const jwtHelper = inject(JwtHelperService);

  const tokenKey = environment.tokenKey; // 'veiculando-wl-op.token'
  const token = SecureStorage.getToken(tokenKey);

  if (token && !jwtHelper.isTokenExpired(token)) {
    // TODO: Checar permissões granulares do operador lendo claims do JWT
    return true;
  }

  SecureStorage.clear(tokenKey);
  router.navigate(['/login']);
  return false;
};
