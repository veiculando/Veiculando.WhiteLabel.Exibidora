import { TestBed } from '@angular/core/testing';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { environment } from '../../../environments/environment';
import { PermissionService } from './permission.service';
import { SecureStorage } from './secure-storage';

/**
 * Monta um JWT nao assinado com as claims informadas.
 *
 * O PermissionService so DECODIFICA o token — quem o valida e o BFF. Assinar
 * aqui nao acrescentaria nada ao que esta sob teste e exigiria carregar uma
 * biblioteca de cripto no browser de teste.
 */
function tokenCom(claims: Record<string, unknown>, expiraEmMinutos = 60): string {
    const exp = Math.floor(Date.now() / 1000) + expiraEmMinutos * 60;
    const payload = { ...claims, exp };

    const base64 = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${base64({ alg: 'none', typ: 'JWT' })}.${base64(payload)}.assinatura`;
}

describe('PermissionService', () => {
    let service: PermissionService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [{ provide: JWT_OPTIONS, useValue: {} }, JwtHelperService, PermissionService],
        });
        service = TestBed.inject(PermissionService);
        localStorage.clear();
    });

    afterEach(() => localStorage.clear());

    it('sem token, nao concede permissao', () => {
        expect(service.has('PecaGerenciar')).toBe(false);
    });

    it('reconhece a claim quando vem como array', () => {
        SecureStorage.setToken(environment.tokenKey, tokenCom({ permission: ['PecaGerenciar', 'Checking'] }));

        expect(service.has('PecaGerenciar')).toBe(true);
        expect(service.has('Checking')).toBe(true);
        expect(service.has('UsuarioAfiliadaGerenciar')).toBe(false);
    });

    it('reconhece a claim quando vem como string unica', () => {
        // O AuthController emite uma claim `permission` por permissao; com apenas
        // uma, o decode devolve string em vez de array.
        SecureStorage.setToken(environment.tokenKey, tokenCom({ permission: 'Checking' }));

        expect(service.has('Checking')).toBe(true);
        expect(service.has('PecaGerenciar')).toBe(false);
    });

    it('NAO trata "*" como coringa', () => {
        // Havia tratamento de '*' concedendo tudo. O valor nao existe em
        // WlPermissoesValidas nem nas policies do BFF: um token com '*' abriria o
        // menu e as rotas no cliente enquanto toda escrita voltaria 403.
        SecureStorage.setToken(environment.tokenKey, tokenCom({ permission: '*' }));
        expect(service.has('PecaGerenciar')).toBe(false);

        SecureStorage.setToken(environment.tokenKey, tokenCom({ permission: ['*'] }));
        expect(service.has('PecaGerenciar')).toBe(false);
    });

    it('token expirado nao concede permissao', () => {
        SecureStorage.setToken(environment.tokenKey, tokenCom({ permission: ['PecaGerenciar'] }, -10));

        expect(service.has('PecaGerenciar')).toBe(false);
    });

    it('lixo nao cifrado no storage nao derruba a aplicacao', () => {
        localStorage.setItem(environment.tokenKey, 'isto-nao-e-um-token-cifrado');

        expect(() => service.has('PecaGerenciar')).not.toThrow();
        expect(service.has('PecaGerenciar')).toBe(false);
    });

    /**
     * O caso acima e ambiguo de proposito: decifrar lixo com AES ora estoura no
     * `toString(Utf8)` (e o SecureStorage devolve null, caminho facil), ora
     * devolve uma string qualquer nao-vazia. So o segundo ramo alcanca o
     * `isTokenExpired`, e ele dependia do ambiente — verde local, vermelho no CI.
     *
     * Este cifra um valor que NAO e JWT, entao a decifragem sempre da certo e o
     * ramo perigoso e sempre exercitado: o `isTokenExpired` recebe uma string de
     * uma parte so e lanca. Enquanto ele esteve fora do try/catch, `has()`
     * propagava a excecao para o authGuard e para a renderizacao do menu.
     */
    it('token cifrado que nao e um JWT nao propaga excecao', () => {
        SecureStorage.setToken(environment.tokenKey, 'nao-sou-um-jwt');

        expect(() => service.has('PecaGerenciar')).not.toThrow();
        expect(service.has('PecaGerenciar')).toBe(false);
        expect(() => service.getOperatorName()).not.toThrow();
        expect(service.getOperatorName()).toBe('Operador WL');
    });

    it('JWT malformado com partes a mais tambem e tratado', () => {
        SecureStorage.setToken(environment.tokenKey, 'a.b.c.d.e');

        expect(() => service.has('PecaGerenciar')).not.toThrow();
        expect(service.has('PecaGerenciar')).toBe(false);
    });

    it('devolve o nome do operador a partir das claims', () => {
        SecureStorage.setToken(environment.tokenKey, tokenCom({ permission: [], name: 'Fulano de Tal' }));

        expect(service.getOperatorName()).toBe('Fulano de Tal');
    });

    it('sem token, o nome cai no rotulo generico', () => {
        expect(service.getOperatorName()).toBe('Operador WL');
    });
});
