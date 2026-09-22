import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { DashboardFinanceiroKpis } from '../../core/models/wl.models';
import { DashboardComponent } from './dashboard.component';

const FINANCEIRO_PADRAO: DashboardFinanceiroKpis = {
  periodo: { id: 10, nome: 'Bissemana 16 — 2026', dataInicio: '2026-08-03', dataFim: '2026-08-16', vigente: true },
  faturamentoPrevisto: { disponivel: false, valor: null, variacaoPercentualVsCicloAnterior: null },
  taxaOcupacaoOOH: { disponivel: true, formulaProvisoria: true, percentual: 0, pecasOcupadas: 0, pecasAtivas: 0 },
  campanhasAtivas: 0,
  demandasPendentes: { formulaProvisoria: true, reservas: 0, pedidosInsercao: 0 },
};

/**
 * TP-B, seção 2: o dashboard não pode voltar a exibir uma "Receita mensal"
 * mockada — nem como card visível, nem como campo lido da resposta do BFF.
 *
 * VEI-RD-85 acrescentou o painel financeiro (período + 4 KPIs + 2 listas),
 * que dispara três chamadas adicionais no `ngOnInit`
 * (`/lookups/periodos`, `/dashboard/kpis-financeiro` e, a partir da resposta
 * desta última, `/dashboard/reservas` + `/dashboard/pedidos-insercao`) — os
 * testes agora resolvem todas elas, não só `/dashboard/kpis`.
 *
 * `await fixture.whenStable()` é necessário entre o flush e a leitura do DOM:
 * o Angular 22 usa um scheduler de change detection coalescido (baseado em
 * microtask) mesmo com zone.js — um `detectChanges()` síncrono logo após o
 * `flush()` não é suficiente para os `@if` do template reavaliarem antes da
 * leitura de `textContent`, e o teste lia a tela ainda no estado
 * "Carregando…" sem nenhum erro (falso negativo silencioso).
 */
describe('DashboardComponent', () => {
    let fixture: ComponentFixture<DashboardComponent>;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [DashboardComponent],
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])],
        });
        fixture = TestBed.createComponent(DashboardComponent);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    /** Sobe a tela e resolve toda a cadeia de chamadas do `ngOnInit`. */
    async function carregarTudo(financeiro: DashboardFinanceiroKpis = FINANCEIRO_PADRAO): Promise<void> {
        fixture.detectChanges();

        http.expectOne(`${environment.bffUrl}/dashboard/kpis`).flush({
            locaisAtivos: 3,
            pecasEmExibicao: 5,
            pedidosPendentes: 1,
            alertasAprovaçãoPendente: 0,
        });
        http.expectOne(`${environment.bffUrl}/lookups/periodos`).flush([
            { id: financeiro.periodo.id, nome: financeiro.periodo.nome, dataInicio: financeiro.periodo.dataInicio, dataFim: financeiro.periodo.dataFim },
        ]);
        http.expectOne(`${environment.bffUrl}/dashboard/kpis-financeiro`).flush(financeiro);

        await fixture.whenStable();
        fixture.detectChanges();

        http.expectOne((req) => req.url === `${environment.bffUrl}/dashboard/reservas`).flush([]);
        http.expectOne((req) => req.url === `${environment.bffUrl}/dashboard/pedidos-insercao`).flush([]);

        await fixture.whenStable();
        fixture.detectChanges();
    }

    it('nao renderiza nenhum card de receita mensal, mockado ou nao', async () => {
        await carregarTudo();

        const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(texto).not.toContain('Receita mensal');
    });

    it('Faturamento Previsto aparece como "Indisponível" quando o BFF nao tem a formula (nunca R$ 0,00 fixo)', async () => {
        await carregarTudo();

        const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(texto).toContain('Faturamento Previsto');
        expect(texto).toContain('Indisponível');
        expect(texto).not.toContain('R$ 0,00');
    });

    it('renderiza os KPIs operacionais restantes normalmente, mesmo sem receita no payload', async () => {
        await carregarTudo();

        const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(texto).toContain('Locais ativos');
        expect(texto).toContain('3');
        expect(texto).toContain('Peças em exibição');
        expect(texto).toContain('5');
        expect(texto).toContain('Pedidos pendentes');
    });

    it('renderiza os 4 KPIs financeiros do Figma (Taxa de Ocupação, Campanhas Ativas, Demandas Pendentes)', async () => {
        await carregarTudo({
            ...FINANCEIRO_PADRAO,
            taxaOcupacaoOOH: { disponivel: true, formulaProvisoria: true, percentual: 78, pecasOcupadas: 39, pecasAtivas: 50 },
            campanhasAtivas: 37,
            demandasPendentes: { formulaProvisoria: true, reservas: 14, pedidosInsercao: 9 },
        });

        const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(texto).toContain('Taxa de Ocupação OOH');
        expect(texto).toContain('78%');
        expect(texto).toContain('Campanhas Ativas');
        expect(texto).toContain('37');
        expect(texto).toContain('Demandas Pendentes');
        expect(texto).toContain('14 reservas');
        expect(texto).toContain('9 PIs');
    });

    it('badge "VIGENTE AGORA" só aparece quando o período devolvido é o vigente', async () => {
        await carregarTudo({ ...FINANCEIRO_PADRAO, periodo: { ...FINANCEIRO_PADRAO.periodo, vigente: false } });

        const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(texto).not.toContain('VIGENTE AGORA');
    });

    /**
     * Mesmo que um BFF ainda não atualizado mande o campo de volta (deploy em
     * andamento, cache), a tela não deve voltar a mostrá-lo — o componente
     * simplesmente não lê `receitaMensal` do payload nunca mais.
     */
    it('ignora receitaMensal mesmo se o payload de /dashboard/kpis ainda vier com o campo', async () => {
        fixture.detectChanges();

        http.expectOne(`${environment.bffUrl}/dashboard/kpis`).flush({
            locaisAtivos: 1,
            pecasEmExibicao: 1,
            pedidosPendentes: 0,
            receitaMensal: 0,
            alertasAprovaçãoPendente: 0,
        });
        http.expectOne(`${environment.bffUrl}/lookups/periodos`).flush([]);
        http.expectOne(`${environment.bffUrl}/dashboard/kpis-financeiro`).flush(FINANCEIRO_PADRAO);

        await fixture.whenStable();
        fixture.detectChanges();

        http.expectOne((req) => req.url === `${environment.bffUrl}/dashboard/reservas`).flush([]);
        http.expectOne((req) => req.url === `${environment.bffUrl}/dashboard/pedidos-insercao`).flush([]);

        await fixture.whenStable();
        fixture.detectChanges();

        const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(texto).not.toContain('Receita mensal');
    });
});
