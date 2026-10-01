import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BrandingService } from '../branding/branding.service';

/**
 * Libera as rotas `/marketing/*` só quando o módulo CMS está ligado nesta
 * instância (`cmsHabilitado === true` no branding, ADR-CMS-004).
 *
 * Complementa o `authGuard`, não o substitui: a permissão `ConteudoGerenciar`
 * continua sendo checada por ele em cada rota filha. Um operador com a
 * permissão numa exibidora sem CMS cai aqui.
 *
 * A leitura síncrona do signal é segura porque o branding carrega no
 * `provideAppInitializer` (`app.config.ts`), antes da primeira navegação. Se o
 * branding falhou, o signal é `null` e a rota é negada.
 */
export const cmsGuard: CanActivateFn = () => {
  if (inject(BrandingService).branding()?.cmsHabilitado === true) return true;
  return inject(Router).createUrlTree(['/acesso-negado']);
};
