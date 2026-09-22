import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { OrdemServicoEntregaModalComponent } from './ordem-servico-entrega-modal.component';
import { environment } from '../../../environments/environment';

/**
 * Modal de entrega — VEI-RD-88c (Figma `187:1364`, 560×512).
 *
 * Regra dura, decisão humana fechada 2026-09-17: só "Impressa (PDF) —
 * Planilha de Programação" é renderizada. "Atribuir a um Colador" não pode
 * existir no DOM em NENHUMA circunstância — nem desabilitada.
 */
describe('OrdemServicoEntregaModalComponent', () => {
  let httpMock: HttpTestingController;
  const base = `${environment.bffUrl}/ordens-servico`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('nunca renderiza "Atribuir a um Colador", em nenhum estado', () => {
    const fixture = TestBed.createComponent(OrdemServicoEntregaModalComponent);
    fixture.componentInstance.aberto = true;
    fixture.componentInstance.contexto = { id: 42, numero: 42, pecasCount: 3, periodoNome: 'Bissemana 16, 2026' };

    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Atribuir a um Colador');
    expect(texto).not.toContain('Colador');
  });

  it('so renderiza a opcao Impressa (PDF) — Planilha de Programação', () => {
    const fixture = TestBed.createComponent(OrdemServicoEntregaModalComponent);
    fixture.componentInstance.aberto = true;
    fixture.componentInstance.contexto = { id: 42, numero: 42, pecasCount: 3, periodoNome: 'Bissemana 16, 2026' };

    fixture.detectChanges();

    const opcoes = (fixture.nativeElement as HTMLElement).querySelectorAll('.oem-opcao');
    expect(opcoes.length).toBe(1);
    expect(opcoes[0].textContent).toContain('Impressa (PDF)');
    expect(opcoes[0].textContent).toContain('Planilha de Programação');
  });

  it('titulo e subtitulo seguem o texto exato do card', () => {
    const fixture = TestBed.createComponent(OrdemServicoEntregaModalComponent);
    fixture.componentInstance.aberto = true;
    fixture.componentInstance.contexto = { id: 42, numero: 42, pecasCount: 3, periodoNome: 'Bissemana 16, 2026' };

    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#oem-titulo')?.textContent?.trim()).toBe('Entregar Ordem de Serviço');
    expect(el.querySelector('#oem-subtitulo')?.textContent?.trim()).toBe(
      'OS #0042 gerada com 3 peças — Bissemana 16, 2026'
    );
  });

  it('nao renderiza nada quando fechado', () => {
    const fixture = TestBed.createComponent(OrdemServicoEntregaModalComponent);
    fixture.componentInstance.aberto = false;

    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]')).toBeNull();
  });

  it('confirmar entrega chama entregar() e depois baixa a planilha como blob', () => {
    const fixture = TestBed.createComponent(OrdemServicoEntregaModalComponent);
    fixture.componentInstance.aberto = true;
    fixture.componentInstance.contexto = { id: 42, numero: 42, pecasCount: 3, periodoNome: 'Bissemana 16, 2026' };
    vi.spyOn(window, 'open').mockReturnValue(null);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    fixture.detectChanges();

    fixture.componentInstance.confirmarEntrega();

    const reqEntregar = httpMock.expectOne(`${base}/42/entregar`);
    expect(reqEntregar.request.body).toEqual({ modo: 'impressa' });
    reqEntregar.flush({ message: 'ok' });

    const reqPdf = httpMock.expectOne(`${base}/42/planilha-pdf`);
    expect(reqPdf.request.responseType).toBe('blob');
    reqPdf.flush(new Blob(['%PDF-']));

    expect(fixture.componentInstance.entregando).toBe(false);
  });

  it('falha ao entregar mostra mensagem, sem baixar planilha', () => {
    const fixture = TestBed.createComponent(OrdemServicoEntregaModalComponent);
    fixture.componentInstance.aberto = true;
    fixture.componentInstance.contexto = { id: 42, numero: 42, pecasCount: 3, periodoNome: 'Bissemana 16, 2026' };
    fixture.detectChanges();

    fixture.componentInstance.confirmarEntrega();

    httpMock.expectOne(`${base}/42/entregar`).flush(null, { status: 500, statusText: 'Erro' });

    expect(fixture.componentInstance.erro).toBeTruthy();
    expect(fixture.componentInstance.entregando).toBe(false);
    httpMock.expectNone(`${base}/42/planilha-pdf`);
  });
});
