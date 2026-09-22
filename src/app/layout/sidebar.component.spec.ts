import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PermissionService } from '../core/auth/permission.service';
import { SidebarComponent } from './sidebar.component';

/**
 * VEI-RD-76, passo 6: reorganização do menu conforme PRD §4 (Shell.tsx:16-54).
 * A sprint 10 entrega rotas para Locais, Valores de Peças, Programação,
 * Checking, Check out, Ordem de Serviço, Pedidos de Reserva, Pedidos de
 * Inserção, Relatórios e Usuários, mais Agências, Análise KYC, Campanhas,
 * Prospecção e Cadastro e acesso. O que ainda não tem rota — Anunciantes e
 * Tipos de Suporte — continua proibido de aparecer, nem como link morto.
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
    configurar(['PecaGerenciar', 'CheckingGerenciar', 'ProgramacaoVisualizar', 'PedidoReservaGerenciar', 'PedidoInsercaoGerenciar', 'UsuarioAfiliadaGerenciar']);
    fixture.detectChanges();

    expect(textoGrupos()).toEqual(['Inventário', 'Comercial', 'Operacional', 'Configurações']);
  });

  it('Check out e Ordem de Servico aparecem no grupo Operacional, cada um com sua permissao', () => {
    configurar(['CheckingGerenciar', 'PecaGerenciar']);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Check out');
    expect(texto).toContain('Ordem de Serviço');
  });

  it('Ordem de Servico exige PecaGerenciar (mesma policy do OrdensServicoController real) e some sem ela', () => {
    configurar(['CheckingGerenciar']);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Ordem de Serviço');
  });

  it('Check out some sem a permissao CheckingGerenciar', () => {
    configurar([]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Check out');
  });

  it('Dashboard aparece fora de qualquer grupo, sempre visivel', () => {
    configurar([]);
    fixture.detectChanges();
    const dashboard = (fixture.nativeElement as HTMLElement).querySelector('a[href="/dashboard"]');
    expect(dashboard?.textContent?.trim()).toBe('Dashboard');
    expect(dashboard?.closest('.nav-section')).toBeNull();
  });

  it('item sem rota nunca aparece (Anunciantes, Tipos de Suporte)', () => {
    configurar(['PecaGerenciar', 'CheckingGerenciar', 'ProgramacaoVisualizar', 'PedidoReservaGerenciar', 'PedidoInsercaoGerenciar', 'UsuarioAfiliadaGerenciar']);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const rotuloSemRota of [
      'Anunciantes', 'Tipos de Suporte',
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
    configurar(['PecaGerenciar', 'CheckingGerenciar', 'ProgramacaoVisualizar', 'PedidoReservaGerenciar', 'PedidoInsercaoGerenciar', 'UsuarioAfiliadaGerenciar']);
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

  // VEI-RD-93: os dois itens abaixo guardam permissao, e cada guarda e exercitada
  // dos DOIS lados, em testes separados. O helper `configurar` chama
  // TestBed.configureTestingModule, que nao pode rodar duas vezes no mesmo `it`
  // depois de o componente existir — um estado por teste, um detectChanges por teste.
  it('Programação aparece com ProgramacaoVisualizar concedida', () => {
    configurar(['ProgramacaoVisualizar']);
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/programacao"]');
    expect(link?.textContent?.trim()).toBe('Programação');
  });

  it('Programação some sem ProgramacaoVisualizar', () => {
    // O teste anterior afirmava o contrario — que Programação nao exigia
    // permissao nenhuma. Era a regressao escrita como contrato.
    configurar([]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/programacao"]')).toBeNull();
  });

  it('Checking aparece com CheckingGerenciar', () => {
    configurar(['CheckingGerenciar']);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/checking"]')).not.toBeNull();
  });

  it('Checking NAO aparece com o nome antigo "Checking"', () => {
    // A claim antiga foi renomeada pela migration
    // RenomearCheckingEGrantProgramacaoVisualizar. Aceitar 'Checking' aqui
    // reabriria a colisao que fazia o authGuard falhar aberto.
    configurar(['Checking']);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/checking"]')).toBeNull();
  });

  it('nenhum item renderizado aponta para uma rota que nao existe no app', () => {
    configurar(['PecaGerenciar', 'CheckingGerenciar', 'ProgramacaoVisualizar', 'PedidoReservaGerenciar', 'PedidoInsercaoGerenciar', 'UsuarioAfiliadaGerenciar']);
    fixture.detectChanges();
    const rotasConhecidas = [
      '/dashboard', '/locais', '/programacao', '/checking', '/pedidos-reserva',
      '/pedidos-insercao', '/usuarios',
      // Entregues pelo plano 3.
      '/agencias', '/kyc', '/prospeccao', '/campanhas', '/configuracoes/cadastro-acesso',
      // Entregues pelo plano 5.
      '/pecas/valores', '/relatorios',
      // Entregues pelo plano 4.
      '/checkout', '/ordens-servico',
    ];
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a[href]'));
    for (const link of links) {
      expect(rotasConhecidas).toContain(link.getAttribute('href'));
    }
  });
});
