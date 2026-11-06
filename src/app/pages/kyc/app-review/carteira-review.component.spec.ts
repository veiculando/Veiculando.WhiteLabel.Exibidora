import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PermissionService } from '../../../core/auth/permission.service';
import { environment } from '../../../../environments/environment';
import { CarteiraReviewComponent, formatarCnpj } from './carteira-review.component';

describe('CarteiraReviewComponent — clientes das vendedoras (VEI-RD-157d)', () => {
  const base = `${environment.bffUrl}/kyc/app/carteira`;
  const item = {
    id: 'c1', clienteId: 10, status: 'PendenteAnalise', origem: 'Cadastro', vendedorId: 7, vendedora: 'ana@aurum.com',
    motivo: null, atualizadoEm: '2026-11-05T10:00:00', nome: 'Padaria Sol', razaoSocial: 'Sol Ltda', cnpj: '11222333000181',
  };
  const detalhe = {
    ...item, solicitante: 'ana@aurum.com',
    cliente: { nome: 'Padaria Sol', razaoSocial: 'Sol Ltda', cnpj: '11222333000181', cidade: 'Goiânia', uf: 'GO' },
    documentos: [{ id: 'd1', tipo: 'corporate', nome: 'contrato.pdf', contentType: 'application/pdf', tamanho: 10 }],
    historico: [{ evento: 'Enviado', usuario: 'ana@aurum.com', vendedoraDe: null, vendedoraPara: null, statusDe: 'Rascunho', statusPara: 'PendenteAnalise', motivo: null, em: '2026-11-05T10:00:00' }],
  };

  let fixture: ComponentFixture<CarteiraReviewComponent>;
  let http: HttpTestingController;

  function montar(permissoes: string[]) {
    TestBed.configureTestingModule({
      imports: [CarteiraReviewComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: PermissionService, useValue: { has: (p: string) => permissoes.includes(p) } }],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CarteiraReviewComponent);
    fixture.detectChanges();
    http.expectOne(r => r.url === base && r.params.get('status') === 'PendenteAnalise').flush([item]);
  }

  function abrir() {
    fixture.componentInstance.select('c1');
    http.expectOne(`${base}/c1`).flush(detalhe);
    fixture.detectChanges();
  }

  afterEach(() => { http.verify(); TestBed.resetTestingModule(); });
  const root = () => fixture.nativeElement as HTMLElement;

  it('lista com a vendedora e formata o CNPJ', () => {
    montar(['ClienteGerenciar']);
    fixture.detectChanges();
    expect(root().textContent).toContain('ana@aurum.com');
    expect(root().textContent).toContain('11.222.333/0001-81');
    expect(formatarCnpj('123')).toBe('123');
  });

  it('pede motivo para ajustes e mostra a recusa de autoanálise do BFF', () => {
    montar(['ClienteGerenciar']);
    abrir();
    const page = fixture.componentInstance;
    page.decidir('ajustes');
    expect(page.error).toBe('Informe o motivo da decisão.');
    http.expectNone(`${base}/c1/ajustes`);
    page.reason = 'Contrato ilegível';
    page.decidir('ajustes');
    const req = http.expectOne(`${base}/c1/ajustes`);
    expect(req.request.body).toEqual({ reason: 'Contrato ilegível' });
    req.flush({ message: 'Quem enviou o cadastro não pode analisá-lo.' }, { status: 403, statusText: 'Forbidden' });
    expect(page.error).toBe('Quem enviou o cadastro não pode analisá-lo.');
  });

  it('aprova e recarrega fila e detalhe', () => {
    montar(['ClienteGerenciar']);
    abrir();
    fixture.componentInstance.aprovar();
    http.expectOne(`${base}/c1/aprovar`).flush({ id: 'c1', status: 'Aprovado' });
    http.expectOne(r => r.url === base).flush([]);
    http.expectOne(`${base}/c1`).flush({ ...detalhe, status: 'Aprovado' });
    expect(fixture.componentInstance.notice).toContain('aprovado');
  });

  it('troca de responsável só com UsuarioAfiliadaGerenciar', () => {
    montar(['ClienteGerenciar', 'UsuarioAfiliadaGerenciar']);
    http.expectOne(`${base}/vendedoras`).flush([{ id: 7, nome: 'Ana', email: 'ana@aurum.com' }, { id: 8, nome: 'Bia', email: 'bia@aurum.com' }]);
    abrir();
    expect(root().textContent).toContain('Trocar responsável');
    expect(root().textContent).toContain('Bia (bia@aurum.com)');
    const page = fixture.componentInstance;
    page.novaVendedora = 8; page.motivoTroca = 'Ana saiu';
    page.trocar();
    expect(http.expectOne(`${base}/c1/responsavel`).request.body).toEqual({ vendedorId: 8, reason: 'Ana saiu' });
  });

  it('sem UsuarioAfiliadaGerenciar não mostra a troca nem busca vendedoras', () => {
    montar(['ClienteGerenciar']);
    abrir();
    expect(root().textContent).not.toContain('Trocar responsável');
  });
});
