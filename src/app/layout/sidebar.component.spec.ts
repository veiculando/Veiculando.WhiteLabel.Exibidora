import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PermissionService } from '../core/auth/permission.service';
import { SidebarComponent } from './sidebar.component';

/**
 * VEI-RD-76, passo 6: reorganização do menu conforme PRD §4 (Shell.tsx:16-54).
 * A sprint 10 entrega rotas para Locais, Programação, Checking, Pedidos de
 * Reserva, Pedidos de Inserção, Usuários e — a partir do plano 3 — Agências,
 * Análise KYC, Prospecção, Campanhas e Cadastro e acesso. O que ainda não tem
 * rota (Anunciantes, Valores de Peças, Tipos de Suporte, Relatórios) continua
 * proibido de aparecer, nem como link morto.
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

  it('item sem rota nunca aparece (Anunciantes, Valores de Peças, Relatórios, etc.)', () => {
    configurar(['PecaGerenciar', 'Checking', 'PedidoReservaGerenciar', 'PedidoInsercaoGerenciar', 'UsuarioAfiliadaGerenciar']);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const rotuloSemRota of [
      'Anunciantes', 'Valores de Peças', 'Tipos de Suporte', 'Relatórios',
    ]) {
      expect(texto).not.toContain(rotuloSemRota);
    }
  });

  // Os dois lados, em testes separados: acender o item com a permissao certa E
  // apaga-lo sem ela. So o lado "some" passaria com o item nunca renderizando.
  // Separados porque configurar() reconfigura o TestBed, o que nao pode acontecer
  // depois de um fixture ja criado no mesmo teste.
  const ITENS_DO_PLANO_3 = ['Agências', 'Análise KYC', 'Campanhas', 'Prospecção'];

  it('os itens do plano 3 aparecem quando a permissao existe', () => {
    configurar(['ClienteGerenciar', 'PedidoCriar']);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const rotulo of ITENS_DO_PLANO_3) {
      expect(texto).toContain(rotulo);
    }
  });

  it('os itens do plano 3 somem quando a permissao falta', () => {
    configurar([]);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const rotulo of ITENS_DO_PLANO_3) {
      expect(texto).not.toContain(rotulo);
    }
  });

  it('grupo sem nenhum item habilitado (Financeiro) nao renderiza nem o titulo', () => {
    configurar(['PecaGerenciar', 'Checking', 'PedidoReservaGerenciar', 'PedidoInsercaoGerenciar', 'UsuarioAfiliadaGerenciar']);
    fixture.detectChanges();
    expect(textoGrupos()).not.toContain('Financeiro');
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
      '/dashboard', '/locais', '/programacao', '/checking', '/pedidos-reserva',
      '/pedidos-insercao', '/usuarios',
      // Entregues pelo plano 3.
      '/agencias', '/kyc', '/prospeccao', '/campanhas', '/configuracoes/cadastro-acesso',
    ];
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a[href]'));
    for (const link of links) {
      expect(rotasConhecidas).toContain(link.getAttribute('href'));
    }
  });
});
