import { Route } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { routes } from './app.routes';
import { PERMISSOES_WL } from './core/models/wl.models';

/**
 * Trava a regressao em que as rotas com `data.permission` deixaram de checar
 * permissao alguma.
 *
 * O refactor que introduziu o ShellComponent moveu `canActivate: [authGuard]`
 * para a rota PAI e removeu dos filhos. O guard recebe o
 * `ActivatedRouteSnapshot` da rota onde esta declarado — no pai, `route.data`
 * nao contem o `permission` do filho, entao a checagem simplesmente nao
 * acontecia e qualquer operador autenticado abria /usuarios, /locais,
 * /checking, /pedidos-reserva e /pedidos-insercao por deep link.
 *
 * Nao era falha de seguranca (o BFF exige as policies e devolve 403), mas o
 * caminho descrito na ADR-WL-007 estava morto e a pagina de acesso-negado
 * documenta esse caminho como funcional.
 *
 * Estes testes sao estruturais de proposito: verificam a CONFIGURACAO das
 * rotas, nao o comportamento em navegacao. E a configuracao que regrediu, e um
 * teste de navegacao passaria mesmo com o guard so no pai — porque o pai roda.
 */
describe('app.routes', () => {
    const areaProtegida = routes.find((r) => r.path === '' && !!r.children)!;
    const filhos: Route[] = areaProtegida.children ?? [];

    const comPermissao = filhos.filter((r) => !!r.data?.['permission']);

    it('a area protegida existe e tem guard no proprio no', () => {
        expect(areaProtegida).toBeTruthy();
        expect(areaProtegida.canActivate).toContain(authGuard);
    });

    it('todas as permissoes da whitelist aparecem nas rotas protegidas', () => {
        // Várias subrotas podem reutilizar a mesma permissão (por exemplo, o
        // wizard e o formulário de peça usam PecaGerenciar). O contrato é a
        // cobertura da whitelist, não uma quantidade fixa de rotas.
        const declaradas = [...new Set(
            comPermissao.map((r) => r.data!['permission'] as string)
        )].sort();

        expect(declaradas).toEqual([...PERMISSOES_WL].sort());
    });

    comPermissao.forEach((rota) => {
        const caminho = rota.path!;
        it(`/${caminho} tem canActivate proprio, senao a permissao nao e lida`, () => {
            expect(rota.canActivate, `/${caminho} declara data.permission mas nao tem canActivate. ` +
                `O guard no pai recebe o snapshot do pai, cujo data nao tem permission — ` +
                `a checagem nao acontece.`).toContain(authGuard);
        });
    });

    it('toda permissao declarada nas rotas existe na whitelist do dominio', () => {
        const declaradas = comPermissao.map((r) => r.data!['permission'] as string);

        declaradas.forEach((p) => {
            expect(PERMISSOES_WL as readonly string[], `permissao '${p}' nao existe em WlPermissoesValidas`).toContain(p);
        });
    });

    it('rotas publicas ficam fora da area protegida', () => {
        // /login e /acesso-negado nao podem herdar o guard: quem chega nelas ou nao
        // tem sessao, ou foi barrado por permissao. Guard ali seria um loop.
        ['login', 'acesso-negado'].forEach((caminho) => {
            const rota = routes.find((r) => r.path === caminho);
            expect(rota, `/${caminho} deveria ser rota de topo`).toBeTruthy();
            expect(rota!.canActivate).toBeUndefined();
        });
    });
});
