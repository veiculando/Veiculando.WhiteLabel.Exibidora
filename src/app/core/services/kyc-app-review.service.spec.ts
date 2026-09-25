import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { KycAppReviewService } from './kyc-app-review.service';

describe('KycAppReviewService', () => {
  let service: KycAppReviewService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(KycAppReviewService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('consulta a fila do App separada da fila legada', () => {
    service.queue().subscribe(items => expect(items[0].tipoConta).toBe('ag'));
    http.expectOne('/api/wl/kyc/app').flush([{ id: 'id-1', tipoConta: 'ag', status: 1 }]);
  });

  it('envia motivo na solicitação de ajustes', () => {
    service.decide('id-1', 'adjustments', 'Falta identificação').subscribe();
    const request = http.expectOne('/api/wl/kyc/app/id-1/adjustments');
    expect(request.request.body).toEqual({ reason: 'Falta identificação' });
    request.flush({ status: 3 });
  });

  it('baixa documento só pela rota privada com autorização do interceptor', () => {
    service.document('case-1', 'doc-1').subscribe(blob => expect(blob.size).toBe(3));
    const request = http.expectOne('/api/wl/kyc/app/case-1/documents/doc-1');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['pdf'], { type: 'application/pdf' }));
  });
});
