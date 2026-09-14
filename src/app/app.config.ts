import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/auth/jwt.interceptor';
import { BrandingService } from './core/branding/branding.service';
import { authErrorInterceptor } from './core/http/auth-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withXhr(),
      withInterceptors([authErrorInterceptor, jwtInterceptor])
    ),
    provideAppInitializer(() => inject(BrandingService).load()),
    { provide: JWT_OPTIONS, useValue: {} },
    JwtHelperService,
  ],
};
