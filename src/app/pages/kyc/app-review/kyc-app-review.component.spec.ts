import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { KycAppReviewComponent } from './kyc-app-review.component';

describe('KycAppReviewComponent — decisão sobre o cadastro do App', () => {
  const base = `${environment.bffUrl}/kyc/app`;
  const item = { id: 'abc', usuarioId: 7, tipoConta: 'ag', documento: '52425869000181', status: 2, atualizadoEm: '2026-09-01T10:00:00' };
  const detalhe = {
    ...item,
    motivo: null,
    business: { tradeName: 'Singular Con', legalName: 'Singular Con Ltda' },
    documents: [
      { id: 'd1', nome: 'contrato.pdf', tipo: 'corporate', contentType: 'application/pdf', tamanho: 10 },
      { id: 'd2', nome: 'rg.pdf', tipo: 'representative', contentType: 'application/pdf', tamanho: 10 },
    ],
    history: [],
  };

  let fixture: ComponentFixture<KycAppReviewComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KycAppReviewComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(KycAppReviewComponent);
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;

  async function abrirCadastro(): Promise<void> {
    fixture.detectChanges();
    http.expectOne(base).flush([item]);
    await fixture.whenStable();
    fixture.detectChanges();
    (root().querySelector('.queue-item') as HTMLButtonElement).click();
    http.expectOne(`${base}/abc`).flush(detalhe);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function botao(texto: string): HTMLButtonElement {
    const achado = Array.from(root().querySelectorAll('.actions button')).find((b) => b.textContent?.trim() === texto);
    return achado as HTMLButtonElement;
  }

  it('409 do BFF com message mostra a mensagem específica ao aprovar', async () => {
    await abrirCadastro();
    botao('Aprovar cadastro').click();
    http
      .expectOne(`${base}/abc/approve`)
      .flush({ message: 'E-mail do solicitante não confirmado.' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('E-mail do solicitante não confirmado.');
  });

  it('sem message na resposta, mantém o texto genérico', async () => {
    await abrirCadastro();
    botao('Aprovar cadastro').click();
    http.expectOne(`${base}/abc/approve`).flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível registrar a decisão.');
  });
});
