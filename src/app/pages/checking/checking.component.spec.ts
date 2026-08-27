import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CheckingService } from '../../core/services/checking.service';
import { CheckingComponent } from './checking.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

describe('CheckingComponent', () => {
  it('oferece upload real e consulta fotos persistidas do item selecionado', async () => {
    await TestBed.configureTestingModule({
      imports: [CheckingComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        {
          provide: CheckingService,
          useValue: {
            pisAutorizadas: () => of([]),
            itensDaPi: () => of([]),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CheckingComponent);
    fixture.componentInstance.piSelecionada = { codigo: 'PI-1' } as never;
    fixture.componentInstance.itens = [{ idPedidoItem: 1 }] as never;
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('input[type="file"]')).not.toBeNull();
    TestBed.inject(HttpTestingController).expectOne('/api/wl/checking/item/1/fotos').flush([]);
    expect(elemento.textContent).not.toContain('Envio indisponível');
  });
});
