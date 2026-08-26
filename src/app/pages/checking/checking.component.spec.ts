import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CheckingService } from '../../core/services/checking.service';
import { CheckingComponent } from './checking.component';

describe('CheckingComponent', () => {
  it('bloqueia o upload enquanto o endpoint ainda nao persiste a foto', async () => {
    await TestBed.configureTestingModule({
      imports: [CheckingComponent],
      providers: [
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
    expect(elemento.querySelector('input[type="file"]')).toBeNull();
    expect((elemento.querySelector('button[disabled]') as HTMLButtonElement).textContent)
      .toContain('Envio indisponível');
    expect(elemento.querySelector('[role="status"]')?.textContent)
      .toContain('Nenhum arquivo será selecionado');
  });
});
