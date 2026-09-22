import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { CheckoutDetalheComponent } from './checkout-detalhe.component';
import { environment } from '../../../environments/environment';

/**
 * Check out — detalhe (VEI-RD-91, Figma `184:501`).
 *
 * VEI-RD-91d (regra dura desta sprint): "Aprovar Checking"/"Recusar
 * Checking" não podem existir no DOM — nem como botão desabilitado. Um
 * controle que existe e não funciona ensina errado ao usuário.
 */
describe('CheckoutDetalheComponent', () => {
  let httpMock: HttpTestingController;
  const base = `${environment.bffUrl}/checkout`;

  function configurar(codigo = 'PI-1') {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ codigo }) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  it('nunca renderiza Aprovar Checking / Recusar Checking, nem desabilitados', () => {
    configurar();
    const fixture = TestBed.createComponent(CheckoutDetalheComponent);
    // Um unico detectChanges() dispara o ngOnInit — nunca chamar ngOnInit()
    // manualmente E TAMBEM detectChanges(): o Angular invocaria ngOnInit de
    // novo no primeiro detectChanges, disparando a requisicao em dobro.
    fixture.detectChanges();

    httpMock.expectOne(`${base}/PI-1`).flush({
      id: 1,
      codigo: 'PI-1',
      campanha: 'Campanha X',
      anunciante: 'Anunciante Y',
      cidade: 'São Paulo',
      periodoVeiculacaoInicio: '2026-07-01',
      periodoVeiculacaoFim: '2026-07-31',
      status: 'Checking',
      itens: [
        {
          idPedidoItem: 1,
          pecaCodigo: 'PC-1',
          fotoUrl: null,
          endereco: 'Rua A, 100',
          enderecoMapaUrl: 'https://maps.example/x',
          statusItem: 'Autorizado',
          statusChecking: 'Aguardando foto',
          fotosRecebidas: [],
          historicoAvaliacao: [],
        },
      ],
    });

    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Aprovar Checking');
    expect(texto).not.toContain('Recusar Checking');
    expect(fixture.nativeElement.querySelectorAll('button, aurum-button').length).toBeLessThanOrEqual(1);
  });

  it('renderiza o link para mapa quando o endereço tem enderecoMapaUrl', () => {
    configurar();
    const fixture = TestBed.createComponent(CheckoutDetalheComponent);
    fixture.detectChanges();

    httpMock.expectOne(`${base}/PI-1`).flush({
      id: 1,
      codigo: 'PI-1',
      campanha: null,
      anunciante: null,
      cidade: null,
      periodoVeiculacaoInicio: null,
      periodoVeiculacaoFim: null,
      status: 'Novo',
      itens: [
        {
          idPedidoItem: 1,
          pecaCodigo: 'PC-1',
          fotoUrl: null,
          endereco: 'Rua A, 100',
          enderecoMapaUrl: 'https://maps.example/x',
          statusItem: 'Autorizado',
          statusChecking: null,
          fotosRecebidas: [],
          historicoAvaliacao: [],
        },
      ],
    });

    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="https://maps.example/x"]');
    expect(link?.textContent?.trim()).toBe('Ver no mapa');
  });

  it('falha ao carregar mostra mensagem, sem quebrar', () => {
    configurar();
    const fixture = TestBed.createComponent(CheckoutDetalheComponent);
    fixture.detectChanges();

    httpMock.expectOne(`${base}/PI-1`).flush(null, { status: 404, statusText: 'Not Found' });

    expect(fixture.componentInstance.erro).toBeTruthy();
    expect(fixture.componentInstance.detalhe).toBeNull();
  });
});
