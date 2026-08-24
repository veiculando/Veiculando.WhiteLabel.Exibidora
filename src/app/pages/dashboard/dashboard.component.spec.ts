import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { DashboardComponent } from './dashboard.component';

/**
 * TP-B, seção 2: o dashboard não pode voltar a exibir uma "Receita mensal"
 * mockada — nem como card visível, nem como campo lido da resposta do BFF.
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

    it('nao renderiza nenhum card de receita mensal, mockado ou nao', () => {
        fixture.detectChanges();

        http.expectOne(`${environment.bffUrl}/dashboard/kpis`).flush({
            locaisAtivos: 3,
            pecasEmExibicao: 5,
            pedidosPendentes: 1,
            alertasAprovaçãoPendente: 0,
        });
        fixture.detectChanges();

        const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(texto).not.toContain('Receita mensal');
        expect(texto).not.toContain('R$');
    });

    it('renderiza os KPIs restantes normalmente, mesmo sem receita no payload', () => {
        fixture.detectChanges();

        http.expectOne(`${environment.bffUrl}/dashboard/kpis`).flush({
            locaisAtivos: 3,
            pecasEmExibicao: 5,
            pedidosPendentes: 1,
            alertasAprovaçãoPendente: 0,
        });
        fixture.detectChanges();

        const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(texto).toContain('Locais ativos');
        expect(texto).toContain('3');
        expect(texto).toContain('Peças em exibição');
        expect(texto).toContain('5');
        expect(texto).toContain('Pedidos pendentes');
    });

    /**
     * Mesmo que um BFF ainda não atualizado mande o campo de volta (deploy em
     * andamento, cache), a tela não deve voltar a mostrá-lo — o componente
     * simplesmente não lê `receitaMensal` do payload nunca mais.
     */
    it('ignora receitaMensal mesmo se o payload ainda vier com o campo', () => {
        fixture.detectChanges();

        http.expectOne(`${environment.bffUrl}/dashboard/kpis`).flush({
            locaisAtivos: 1,
            pecasEmExibicao: 1,
            pedidosPendentes: 0,
            receitaMensal: 0,
            alertasAprovaçãoPendente: 0,
        });
        fixture.detectChanges();

        const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(texto).not.toContain('Receita mensal');
        expect(texto).not.toContain('R$');
    });
});
