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

    // VEI-RD-93: a lista canônica agora inclui permissões de telas que ainda não
    // existem neste repo — pertencem a outros cards do mesmo plano estratégico
    // (Anunciantes, Agências, Prospecção, Financeiro, Relatórios). Publicar a
    // lista canônica ANTES dessas telas existirem é intencional: quem construir
    // cada uma delas usa um nome já reconhecido pelo authGuard, em vez de
    // inventar um nome novo que precisaria de outra reconciliação depois.
    // A lista encolhe conforme os cards entregam. ClienteGerenciar e PedidoCriar
    // sairam daqui porque o Plano 3 passou a rotea-las de fato: ClienteGerenciar
    // em Anunciantes/Agências/Análises KYC, PedidoCriar em Prospecção. Manter uma
    // permissao ja roteada nesta lista faria o teste aprovar por engano, que e o
    // oposto do que ele existe para fazer.
    const PERMISSOES_RESERVADAS_PARA_OUTROS_CARDS = [
        'FinanceiroVisualizar', // VEI-RD-85 (KPI de Faturamento)
        'RelatorioExportar', // VEI-RD-92 (Relatórios)
    ] as const;

    it('toda permissao da whitelist esta roteada aqui OU e reserva documentada de outro card', () => {
        // Trava o mesmo tanto quanto o teste original: nenhuma permissão pode
        // ficar "esquecida" na whitelist sem que uma rota a use ou que esta
        // lista explique por quê ainda não. Adicionar uma permissão nova sem
        // atualizar nenhum dos dois lados quebra este teste.
        const declaradas = new Set(comPermissao.map((r) => r.data!['permission'] as string));
        const semRotaAinda = (PERMISSOES_WL as readonly string[])
            .filter((p) => !declaradas.has(p))
            .sort();

        expect(semRotaAinda).toEqual([...PERMISSOES_RESERVADAS_PARA_OUTROS_CARDS].sort());
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
        ['login', 'login/esqueci-senha', 'login/alterar-senha', 'login/primeiro-acesso', 'acesso-negado'].forEach((caminho) => {
            const rota = routes.find((r) => r.path === caminho);
            expect(rota, `/${caminho} deveria ser rota de topo`).toBeTruthy();
            expect(rota!.canActivate).toBeUndefined();
        });
    });
});
