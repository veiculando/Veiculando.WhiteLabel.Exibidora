import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { environment } from '../../../environments/environment';
import { SecureStorage } from '../../core/auth/secure-storage';
import { AuthService } from '../../core/services/auth.service';
import { SnapsSupportLoader } from './snaps-support-loader';
import { SuporteComponent } from './suporte.component';

function tokenWl(minutos: number, permitido = true): string {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + minutos * 60,
    permission: permitido ? 'SuporteGerenciar' : 'ConteudoGerenciar',
  };
  const codificar = (valor: object) =>
    btoa(JSON.stringify(valor)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${codificar({ alg: 'none' })}.${codificar(payload)}.sintetico`;
}

describe('SuporteComponent', () => {
  let fixture: ComponentFixture<SuporteComponent>;
  let http: HttpTestingController;
  let carregar: ReturnType<typeof vi.fn>;

  async function iniciar(jwt: string): Promise<void> {
    SecureStorage.setToken(environment.tokenKey, jwt);
    fixture = TestBed.createComponent(SuporteComponent);
    fixture.detectChanges();
    await carregar.mock.results[0].value.catch(() => {});
    await fixture.whenStable();
  }

  const board = () =>
    (fixture.nativeElement as HTMLElement).querySelector('snaps-support-board');

  beforeEach(() => {
    carregar = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      imports: [SuporteComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: JWT_OPTIONS, useValue: {} },
        JwtHelperService,
        { provide: SnapsSupportLoader, useValue: { carregar } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    fixture?.destroy();
    SecureStorage.clear(environment.tokenKey);
  });

  it('configura o board com proxy local, JWT de runtime e os três repositórios', async () => {
    const jwt = tokenWl(60);
    await iniciar(jwt);

    expect(carregar).toHaveBeenCalledTimes(1);
    expect(board()?.getAttribute('api-url')).toBe('/api/wl/snaps');
    expect(board()?.getAttribute('project-id')).toBe('53896f31-9d7f-458b-ab63-8bd6ddb549f6');
    expect(board()?.getAttribute('repositories')).toBe(
      'Veiculando.WhiteLabel.Exibidora,Veiculando.WhiteLabel.App,aurum-landing-page',
    );
    expect(board()?.getAttribute('default-repository')).toBe('Veiculando.WhiteLabel.Exibidora');
    expect(board()?.getAttribute('api-key') === jwt).toBe(true);
  });

  it.each([true, false])('renova o JWT e respeita a claim atualizada (%s)', async (permitido) => {
    await iniciar(tokenWl(5));
    const anterior = board();
    expect(anterior).not.toBeNull();

    TestBed.inject(AuthService).garantirTokenValido().subscribe();
    const jwt = tokenWl(60, permitido);
    http.expectOne('/api/wl/auth/refresh').flush({ token: jwt });
    await fixture.whenStable();

    if (permitido) {
      expect(board()).toBe(anterior);
      expect(board()?.getAttribute('api-key') === jwt).toBe(true);
    } else {
      expect(board()).toBeNull();
      expect(anterior?.isConnected).toBe(false);
    }
  });

  it('desconecta o board ao encerrar a sessão', async () => {
    await iniciar(tokenWl(60));
    const elemento = board();
    expect(elemento?.isConnected).toBe(true);

    TestBed.inject(AuthService).logout();
    await fixture.whenStable();

    expect(board()).toBeNull();
    expect(elemento?.isConnected).toBe(false);
  });

  it('mantém o board desmontado quando o carregamento com SRI falha', async () => {
    carregar.mockRejectedValueOnce(new Error('Falha simulada de integridade'));
    await iniciar(tokenWl(60));

    expect(board()).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('Não foi possível carregar o suporte.');
  });
});
