import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { AcessoNegadoComponent } from './acesso-negado.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Destino de quem tem token valido mas nao tem a permissao exigida — edge case
 * de permissao do roteiro de validacao visual.
 */
describe('AcessoNegadoComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: JWT_OPTIONS, useValue: {} },
        JwtHelperService,
      ],
    });
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('renderiza a mensagem de permissao insuficiente', () => {
    const fixture = TestBed.createComponent(AcessoNegadoComponent);
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Acesso negado');
    expect(texto).toContain('não tem permissão');
  });

  /**
   * A tela fica FORA do shell de proposito: mostrar o menu completo ao lado de
   * "voce nao tem permissao" seria contraditorio, e o menu e justamente o que o
   * guard esconde.
   */
  it('nao renderiza o menu de navegacao do shell', () => {
    const fixture = TestBed.createComponent(AcessoNegadoComponent);
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('nav')).toBeNull();
    expect(elemento.querySelector('app-shell')).toBeNull();
  });

  it('oferece saida para o dashboard', () => {
    const fixture = TestBed.createComponent(AcessoNegadoComponent);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(link?.getAttribute('href')).toBe('/dashboard');
  });

  it('sair limpa o token e manda para o login', () => {
    const fixture = TestBed.createComponent(AcessoNegadoComponent);
    fixture.detectChanges();

    localStorage.setItem(environment.tokenKey, 'token-qualquer');

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const logout = vi.spyOn(TestBed.inject(AuthService), 'logout');

    fixture.componentInstance.sair();

    expect(logout).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith(['/login']);
    expect(localStorage.getItem(environment.tokenKey)).toBeNull();
  });
});
