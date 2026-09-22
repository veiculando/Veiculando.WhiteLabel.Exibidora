import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PermissionService } from '../core/auth/permission.service';
import { SidebarComponent } from './sidebar.component';

/**
 * VEI-RD-76, passo 6: reorganização do menu conforme PRD §4 (Shell.tsx:16-54).
 * A sprint 10 só entrega rotas para Locais, Programação, Checking, Pedidos de
 * Reserva, Pedidos de Inserção e Usuários — todo o resto do PRD (Prospecção,
 * Agências, Anunciantes, Análises KYC, Campanhas, Valores de Peças, Tipos de
 * Suporte, Relatórios, Cadastro e acesso) ainda não tem rota e não pode
 * aparecer, nem como link morto.
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

  it('Dashboard aparece fora de qualquer grupo, sempre visivel', () => {
    configurar([]);
    fixture.detectChanges();
    const dashboard = (fixture.nativeElement as HTMLElement).querySelector('a[href="/dashboard"]');
    expect(dashboard?.textContent?.trim()).toBe('Dashboard');
    expect(dashboard?.closest('.nav-section')).toBeNull();
  });

  it('item sem rota nunca aparece (Prospecção, Agências, Valores de Peças, Relatórios, etc.)', () => {
    configurar(['PecaGerenciar', 'CheckingGerenciar', 'ProgramacaoVisualizar', 'PedidoReservaGerenciar', 'PedidoInsercaoGerenciar', 'UsuarioAfiliadaGerenciar']);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const rotuloSemRota of [
      'Prospecção', 'Agências', 'Anunciantes', 'Análises KYC', 'Campanhas',
      'Valores de Peças', 'Tipos de Suporte', 'Relatórios', 'Cadastro e acesso',
    ]) {
      expect(texto).not.toContain(rotuloSemRota);
    }
  });

  it('grupo sem nenhum item habilitado (Financeiro) nao renderiza nem o titulo', () => {
    configurar(['PecaGerenciar', 'CheckingGerenciar', 'ProgramacaoVisualizar', 'PedidoReservaGerenciar', 'PedidoInsercaoGerenciar', 'UsuarioAfiliadaGerenciar']);
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

  // VEI-RD-93: os dois itens abaixo guardam permissao, e cada guarda e exercitada
  // dos DOIS lados, em testes separados. O helper `configurar` chama
  // TestBed.configureTestingModule, que nao pode rodar duas vezes no mesmo `it`
  // depois de o componente existir — um estado por teste, um detectChanges por teste.
  it('Programação aparece com ProgramacaoVisualizar', () => {
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
    const rotasConhecidas = ['/dashboard', '/locais', '/programacao', '/checking', '/pedidos-reserva', '/pedidos-insercao', '/usuarios'];
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a[href]'));
    for (const link of links) {
      expect(rotasConhecidas).toContain(link.getAttribute('href'));
    }
  });
});
