import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { BrandingPublico, BrandingService } from '../branding/branding.service';
import { cmsGuard } from './cms.guard';

describe('cmsGuard', () => {
  function executar(branding: Partial<BrandingPublico> | null): boolean | UrlTree {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: BrandingService, useValue: { branding: signal(branding) } }],
    });
    return TestBed.runInInjectionContext(
      () => cmsGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as boolean | UrlTree
    );
  }

  it('libera com cmsHabilitado true', () => {
    expect(executar({ nomeExibicao: 'Marca', cmsHabilitado: true })).toBe(true);
  });

  it.each([
    ['desligado', { nomeExibicao: 'Marca', cmsHabilitado: false }],
    ['ausente', { nomeExibicao: 'Marca' }],
    ['sem branding', null],
  ])('CMS %s manda para acesso negado', (_, branding) => {
    const resultado = executar(branding);

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/acesso-negado');
  });
});
