import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { PermissionService } from './permission.service';

/**
 * AuthGuard da Exibidora WL: sessão válida + permissão granular da rota.
 *
 * Fluxo:
 * 1. `AuthService.garantirTokenValido()` resolve a sessão — devolve o token
 *    com folga, renova proativamente se estiver perto de expirar, ou falha se
 *    não houver token / ele já tiver expirado.
 * 2. Sessão inválida → `/login`.
 * 3. Rota com `data.permission` cuja claim não está no JWT → `/acesso-negado`
 *    (ADR-WL-007).
 *
 * A renovação acontece **antes** do token expirar, e não depois: o endpoint
 * `/auth/refresh` no BFF é `[Authorize]`, então um token morto é recusado com
 * 401 e a renovação nunca poderia funcionar nesse ponto. A decisão de quando
 * renovar vive no `AuthService`; aqui só se consome o resultado.
 *
 * A permissão é verificada **depois** da renovação de propósito: o refresh
 * relê as permissões do banco, então uma permissão revogada durante a sessão é
 * respeitada na navegação seguinte em vez de sobreviver até a expiração.
 */
export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const permissionService = inject(PermissionService);
  const auth = inject(AuthService);

  const permissaoExigida: string | undefined = route.data?.['permission'];

  return auth.garantirTokenValido().pipe(
    map((sessaoValida) => {
      if (!sessaoValida) {
        router.navigate(['/login']);
        return false;
      }

      // O PermissionService lê o token do SecureStorage a cada chamada, então
      // já enxerga o token renovado sem nenhuma recarga manual.
      if (permissaoExigida && !permissionService.has(permissaoExigida)) {
        router.navigate(['/acesso-negado']);
        return false;
      }

      return true;
    })
  );
};
