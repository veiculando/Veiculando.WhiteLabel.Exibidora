import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { LookupsService } from './lookups.service';

describe('LookupsService', () => {
    let service: LookupsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), LookupsService],
        });
        service = TestBed.inject(LookupsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('cacheia o resultado: duas chamadas, uma requisicao', () => {
        service.cidades().subscribe();
        service.cidades().subscribe();

        const reqs = http.match(`${environment.bffUrl}/lookups/cidades`);
        expect(reqs.length).toBe(1);
        reqs[0].flush([{ id: 1, nome: 'São Paulo', sigla: 'SP' }]);
    });

    /**
     * `shareReplay(1)` reemite tambem o ERRO para todo assinante futuro. Sem
     * descartar a entrada do cache, uma falha de rede na primeira chamada ficava
     * cacheada pelo resto da sessao — e o formulario de cadastro de local engole o
     * erro (`error: () => this.cidades = []`), entao o dropdown de cidades ficava
     * permanentemente vazio, sem retry, ate recarregar a pagina.
     */
    it('NAO cacheia a falha: apos erro, a proxima chamada refaz a requisicao', () => {
        let primeiroErro: unknown = null;
        service.cidades().subscribe({ error: (e) => (primeiroErro = e) });

        http.expectOne(`${environment.bffUrl}/lookups/cidades`)
            .flush('falhou', { status: 500, statusText: 'Server Error' });

        expect(primeiroErro, 'o erro precisa chegar ao assinante').toBeTruthy();

        // Segunda tentativa: tem de sair requisicao nova.
        let cidades: unknown[] = [];
        service.cidades().subscribe((c) => (cidades = c));

        const segunda = http.expectOne(`${environment.bffUrl}/lookups/cidades`);
        segunda.flush([{ id: 1, nome: 'São Paulo', sigla: 'SP' }]);

        expect(cidades.length).toBe(1);
    });

    /**
     * O cache e um `Map` indexado pelo caminho do lookup, entao "cache proprio"
     * significa duas coisas que precisam ser exercidas JUNTAS:
     *
     *   1. caminhos distintos nao se servem do mesmo balde (senao `periodos()`
     *      devolveria as cidades e nenhuma requisicao de periodos sairia);
     *   2. cada caminho continua cacheando por conta propria (uma requisicao
     *      apesar de duas assinaturas).
     *
     * A versao anterior deste teste assinava cada lookup UMA unica vez. Isso
     * cobria so o item 1 e, apesar do nome, nao exercia cache algum: uma regressao
     * que fizesse o `Map` guardar por instancia em vez de por caminho — perdendo o
     * cache mas mantendo as URLs certas — passaria despercebida. Chamar cada
     * lookup duas vezes e o que transforma o nome do teste em assercao.
     */
    it('cada lookup tem cache proprio: repetir chamadas nao vaza entre caminhos', () => {
        service.cidades().subscribe();
        service.cidades().subscribe();
        service.periodos().subscribe();
        service.periodos().subscribe();

        const cidades = http.match(`${environment.bffUrl}/lookups/cidades`);
        const periodos = http.match(`${environment.bffUrl}/lookups/periodos`);

        expect(cidades.length, 'cidades deve sair uma unica vez, mesmo com duas assinaturas').toBe(1);
        expect(periodos.length, 'periodos precisa de requisicao propria, nao pode ser servido pelo cache de cidades').toBe(1);

        cidades[0].flush([{ id: 1, nome: 'São Paulo', sigla: 'SP' }]);
        periodos[0].flush([]);
    });
});
