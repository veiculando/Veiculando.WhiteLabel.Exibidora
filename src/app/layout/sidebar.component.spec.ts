import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PermissionService } from '../core/auth/permission.service';
import { SidebarComponent } from './sidebar.component';

/**
 * VEI-RD-76, passo 6: reorganização do menu conforme PRD §4 (Shell.tsx:16-54).
 * A sprint 10 entrega rotas para Locais, Valores de Peças, Programação,
 * Checking, Pedidos de Reserva, Pedidos de Inserção, Relatórios e Usuários
 * (VEI-RD-54/87/92, Ordem 5) — o restante do PRD (Prospecção, Agências,
 * Anunciantes, Análises KYC, Campanhas, Tipos de Suporte, Cadastro e acesso)
 * ainda não tem rota e não pode aparecer, nem como link morto.
 */
describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;

  function configurar(permissoes: string[]): void {
    TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        { provide: PermissionService, useValue: { has: (perm: string) => permissoes.includes(perm) } },
      ],
    });
    fixture = TestBed.createComponent(SidebarComponent);
  }

  function textoGrupos(): string[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.section-title')).map(
      (el) => el.textContent?.trim() ?? ''
    );
  }

  it('com todas as permissoes, segue a ordem de grupos do PRD secao 4, sem "Geral"', () => {
    configurar(['PecaGerenciar', 'Checking', 'PedidoReservaGerenciar', 'PedidoInsercaoGerenciar', 'UsuarioAfiliadaGerenciar']);
    fixture.detectChanges();

    expect(textoGrupos()).toEqual(['Inventário', 'Comercial', 'Operacional', 'Configurações']);
  });

  it('Dashboard aparece fora de qualquer grupo, sempre visivel', () => {
    configurar([]);
    fixture.detectChanges();
    const dashboard = (fixture.nativeElement as HTMLElement).querySelector('a[href="/dashboard"]');
    expect(dashboard?.textContent?.trim()).toBe('Dashboard');
    expect(dashboard?.closest('.nav-section')).toBeNull();
  });

  it('item sem rota nunca aparece (Prospecção, Agências, Tipos de Suporte, etc.)', () => {
    configurar(['PecaGerenciar', 'Checking', 'PedidoReservaGerenciar', 'PedidoInsercaoGerenciar', 'UsuarioAfiliadaGerenciar']);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const rotuloSemRota of [
      'Prospecção', 'Agências', 'Anunciantes', 'Análises KYC', 'Campanhas',
      'Tipos de Suporte', 'Cadastro e acesso',
    ]) {
      expect(texto).not.toContain(rotuloSemRota);
    }
  });

  it('Valores de Peças aparece em Inventário quando PecaGerenciar é concedida (VEI-RD-54)', () => {
    configurar(['PecaGerenciar']);
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/pecas/valores"]');
    expect(link?.textContent?.trim()).toBe('Valores de Peças');
  });

  it('grupo sem nenhum item habilitado (Financeiro) nao renderiza nem o titulo', () => {
    configurar(['PecaGerenciar', 'Checking', 'PedidoReservaGerenciar', 'PedidoInsercaoGerenciar', 'UsuarioAfiliadaGerenciar']);
    fixture.detectChanges();
    expect(textoGrupos()).not.toContain('Financeiro');
  });

  it('Relatórios aparece em Financeiro quando FinanceiroVisualizar é concedida (VEI-RD-92)', () => {
    configurar(['FinanceiroVisualizar']);
    fixture.detectChanges();
    expect(textoGrupos()).toContain('Financeiro');
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/relatorios"]');
    expect(link?.textContent?.trim()).toBe('Relatórios');
  });

  it('item que depende de permissao some quando ela falta, e o grupo some se ficar vazio', () => {
    configurar([]);
    fixture.detectChanges();
    // Sem nenhuma permissao, Inventario (so tem Locais, que exige PecaGerenciar) some inteiro.
    expect(textoGrupos()).not.toContain('Inventário');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Locais');
  });

  it('Programação nao exige permissao e aparece mesmo sem nenhuma concedida', () => {
    configurar([]);
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/programacao"]');
    expect(link?.textContent?.trim()).toBe('Programação');
  });

  it('nenhum item renderizado aponta para uma rota que nao existe no app', () => {
    configurar(['PecaGerenciar', 'Checking', 'PedidoReservaGerenciar', 'PedidoInsercaoGerenciar', 'UsuarioAfiliadaGerenciar']);
    fixture.detectChanges();
    const rotasConhecidas = [
      '/dashboard', '/locais', '/pecas/valores', '/programacao', '/checking',
      '/pedidos-reserva', '/pedidos-insercao', '/relatorios', '/usuarios',
    ];
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a[href]'));
    for (const link of links) {
      expect(rotasConhecidas).toContain(link.getAttribute('href'));
    }
  });
});
