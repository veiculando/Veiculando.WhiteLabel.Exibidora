import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { RepresentacaoReviewComponent } from './representacao-review.component';

describe('RepresentacaoReviewComponent — anunciantes das agências (VEI-RD-67i)', () => {
  const base = `${environment.bffUrl}/kyc/app/representacoes`;
  // Payload no formato do BFF (RepresentacaoReviewController), em camelCase (lição do VEI-SUP-27).
  const item = {
    id: 'r1', clienteId: 10, agenciaId: 40, agencia: 'Agência Aurora', status: 'PendenteAnalise', origem: 'Cadastro',
    motivo: null, comissaoAgencia: 12, inicioContrato: '2026-11-10T00:00:00', fimContrato: '2028-11-10T00:00:00',
    atualizadoEm: '2026-11-10T10:00:00', nome: 'Padaria Sol', razaoSocial: 'Sol Ltda', cnpj: '11222333000181',
  };
  const detalhe = {
    id: 'r1', clienteId: 10, status: 'PendenteAnalise', origem: 'Cadastro', motivo: null, comissaoAgencia: 12,
    inicioContrato: '2026-11-10T00:00:00', fimContrato: '2028-11-10T00:00:00', solicitante: 'ag@aurora.com',
    agencia: { id: 40, nome: 'Agência Aurora', cnpj: '44555666000199' },
    cliente: { nome: 'Padaria Sol', razaoSocial: 'Sol Ltda', cnpj: '11222333000181', cidade: 'Goiânia', uf: 'GO' },
    documentos: [
      { id: 'd1', tipo: 'corporate', nome: 'contrato.pdf', contentType: 'application/pdf', tamanho: 10 },
      { id: 'd2', tipo: 'representation-letter', nome: 'carta.pdf', contentType: 'application/pdf', tamanho: 10 },
    ],
    historico: [{ evento: 'Enviado', usuario: 'ag@aurora.com', statusDe: 'Rascunho', statusPara: 'PendenteAnalise', motivo: null, em: '2026-11-10T10:00:00' }],
  };

  let fixture: ComponentFixture<RepresentacaoReviewComponent>;
  let http: HttpTestingController;

  function montar() {
    TestBed.configureTestingModule({
      imports: [RepresentacaoReviewComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RepresentacaoReviewComponent);
    fixture.detectChanges();
    http.expectOne(r => r.url === base && r.params.get('status') === 'PendenteAnalise').flush([item]);
    fixture.detectChanges();
  }

  function abrir(extra: Record<string, unknown> = {}) {
    fixture.componentInstance.select('r1');
    http.expectOne(`${base}/r1`).flush({ ...detalhe, ...extra });
    fixture.detectChanges();
  }

  afterEach(() => { http.verify(); TestBed.resetTestingModule(); });
  const root = () => fixture.nativeElement as HTMLElement;

  it('lista com a agência e o CNPJ formatado, e busca pela agência', () => {
    montar();
    expect(root().textContent).toContain('Agência Aurora');
    expect(root().textContent).toContain('11.222.333/0001-81');
    fixture.componentInstance.search = 'aurora';
    expect(fixture.componentInstance.filtered().length).toBe(1);
    fixture.componentInstance.search = 'outra';
    expect(fixture.componentInstance.filtered().length).toBe(0);
  });

  it('mostra condições, agência e o rótulo da carta de representação', () => {
    montar();
    abrir();
    const texto = root().textContent ?? '';
    expect(texto).toContain('Comissão da agência: 12%');
    expect(texto).toContain('10/11/2026 a 10/11/2028');
    expect(texto).toContain('44.555.666/0001-99');
    expect(texto).toContain('Carta de representação — carta.pdf');
    expect(texto).toContain('Enviado pela agência');
  });

  it('aprova e recarrega fila e detalhe', () => {
    montar();
    abrir();
    fixture.componentInstance.aprovar();
    http.expectOne(`${base}/r1/aprovar`).flush({ id: 'r1', status: 'Aprovado' });
    http.expectOne(r => r.url === base).flush([]);
    http.expectOne(`${base}/r1`).flush({ ...detalhe, status: 'Aprovado' });
    expect(fixture.componentInstance.notice).toContain('aprovada');
  });

  it('pede motivo e mostra a recusa do BFF (contrato vigente)', () => {
    montar();
    abrir();
    const page = fixture.componentInstance;
    page.decidir('ajustes');
    expect(page.error).toBe('Informe o motivo da decisão.');
    http.expectNone(`${base}/r1/ajustes`);
    page.reason = 'Carta sem assinatura';
    page.decidir('ajustes');
    const ajustes = http.expectOne(`${base}/r1/ajustes`);
    expect(ajustes.request.body).toEqual({ reason: 'Carta sem assinatura' });
    ajustes.flush({ id: 'r1', status: 'AjustesSolicitados' });
    http.expectOne(r => r.url === base).flush([]);
    http.expectOne(`${base}/r1`).flush({ ...detalhe, status: 'AjustesSolicitados', motivo: 'Carta sem assinatura' });

    abrir();
    page.aprovar();
    http.expectOne(`${base}/r1/aprovar`).flush({ message: 'A agência já representa este cliente com contrato vigente.' },
      { status: 409, statusText: 'Conflict' });
    expect(page.error).toBe('A agência já representa este cliente com contrato vigente.');
  });

  it('com ajustes pedidos permite reprovar, mas não aprovar', () => {
    montar();
    abrir({ status: 'AjustesSolicitados' });
    expect(root().textContent).toContain('Reprovar');
    expect(root().textContent).not.toContain('Aprovar representação');
  });
});
