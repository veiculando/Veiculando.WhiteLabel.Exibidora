import { PermissionService } from '../../core/auth/permission.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CampanhasComponent } from './campanhas.component';

describe('CampanhasComponent — VEI-RD-51 (módulo consultivo)', () => {
  const base = `${environment.bffUrl}/campanhas`;

  const campanha = {
    Id: 1,
    Codigo: 'CMP-2026-091',
    Nome: 'Lançamento Residencial Andrômeda',
    Status: 1,
    DataInicioPrevisto: '2026-08-03T00:00:00',
    DataFimPrevisto: '2026-08-16T00:00:00',
    Anunciante: 'Construtora Vale Sul',
    Agencia: 'Ímpar Propaganda',
    Periodo: {
      Id: 16,
      Codigo: 'Bissemana 16 — 2026',
      Periodicidade: 0,
      DataInicio: '2026-08-03T00:00:00',
      DataFim: '2026-08-16T00:00:00',
    },
    Pecas: 4,
    ValorTotal: 44000,
  };

  const semAgencia = { ...campanha, Id: 2, Nome: 'Campanha Direta', Agencia: null };

  function pagina(itens: unknown[]) {
    return { Itens: itens, Page: 1, PageSize: 25, Total: itens.length, TotalPaginas: 1 };
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CampanhasComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PermissionService, useValue: { getAfiliadaId: () => '4821' } },
      ],
    }).compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function montar(itens: unknown[] = [campanha]) {
    const fixture = TestBed.createComponent(CampanhasComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url === base).flush(pagina(itens));
    fixture.detectChanges();
    return { fixture, http, texto: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
  }

  it('mostra o badge "Módulo Consultivo"', () => {
    const { texto } = montar();
    expect(texto()).toContain('Módulo Consultivo');
  });

  it('não renderiza nenhum controle de mutação', () => {
    // Regra dura do card: omitidos do DOM, não `disabled`. Um botão desabilitado
    // ainda promete a ação e volta a funcionar com uma linha de DevTools.
    const { fixture } = montar();
    const rotulos = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .map((b) => b.textContent?.trim().toLowerCase() ?? '');

    for (const proibido of ['nova campanha', 'editar', 'excluir', 'aprovar', 'enviar', 'upload', 'salvar']) {
      expect(rotulos.some((r) => r.includes(proibido))).toBe(false);
    }
  });

  it('não há nenhum controle desabilitado fazendo as vezes de ação proibida', () => {
    const { fixture } = montar();
    const desabilitados = (fixture.nativeElement as HTMLElement).querySelectorAll('button[disabled]');
    expect(desabilitados.length).toBe(0);
  });

  it('o card traz código, nome, anunciante, agência, período, peças e valor', () => {
    const { texto } = montar();
    expect(texto()).toContain('CMP-2026-091');
    expect(texto()).toContain('Lançamento Residencial Andrômeda');
    expect(texto()).toContain('Construtora Vale Sul');
    expect(texto()).toContain('Ímpar Propaganda');
    expect(texto()).toContain('4 Peças');
  });

  it('o período mostra rótulo E intervalo', () => {
    // Só o rótulo não diz quando; só o intervalo não diz qual período comercial é.
    const { texto } = montar();
    expect(texto()).toContain('Bissemana 16 — 2026 (03/08/2026 - 16/08/2026)');
  });

  it('agência vazia vira "Venda Direta (Sem Agência)", nunca travessão', () => {
    // Invariante #12: venda sem agência não é ausência de agência.
    const { texto } = montar([semAgencia]);
    expect(texto()).toContain('Venda Direta (Sem Agência)');
    expect(texto()).not.toContain('Agência: —');
  });

  it('os chips de status filtram no servidor', () => {
    const { fixture, http } = montar();
    const chip = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.campanhas__chip'))
      .find((c) => c.textContent?.trim() === 'Encerrada')! as HTMLButtonElement;
    chip.click();

    http.expectOne((r) => r.url === base && r.params.get('status') === 'Encerrada').flush(pagina([]));
    fixture.detectChanges();
  });

  it('o chip Todos limpa o filtro de status', () => {
    const { fixture, http } = montar();
    fixture.componentInstance.status = 'Ativa';
    fixture.componentInstance.selecionarChip('Todos');

    http.expectOne((r) => r.url === base && r.params.get('status') === null).flush(pagina([campanha]));
    fixture.detectChanges();
    expect(fixture.componentInstance.status).toBe('');
  });

  it('a visão de lista traz as colunas derivadas, com os mesmos dados', () => {
    // O Figma só desenhou a visão card; a de lista foi derivada, mesma consulta.
    const { fixture } = montar();
    fixture.componentInstance.modo = 'lista';
    fixture.detectChanges();

    const cabecalhos = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('th'))
      .map((th) => th.textContent?.trim());
    expect(cabecalhos).toEqual([
      'Código', 'Campanha', 'Anunciante', 'Agência', 'Período',
      'Peças', 'Valor Total', 'Status', 'Ação',
    ]);
  });

  it('o valor total vem formatado como moeda, somado no servidor', () => {
    const { texto } = montar();
    expect(texto()).toContain('44.000');
  });
});
