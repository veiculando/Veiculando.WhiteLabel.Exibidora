import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { LocalPecasStepComponent } from './local-pecas-step.component';
import { PecaService } from '../services/peca.service';
import { StatusExibicao } from '../models/status-exibicao.enum';

describe('LocalPecasStepComponent', () => {
  let fixture: ComponentFixture<LocalPecasStepComponent>;
  let pecaServiceSpy: jasmine.SpyObj<PecaService>;

  beforeEach(async () => {
    pecaServiceSpy = jasmine.createSpyObj('PecaService', ['listPecasByLocal']);
    await TestBed.configureTestingModule({
      imports: [LocalPecasStepComponent],
      providers: [{ provide: PecaService, useValue: pecaServiceSpy }, provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(LocalPecasStepComponent);
  });

  it('lista as peças do local recebido via @Input idLocal', () => {
    pecaServiceSpy.listPecasByLocal.and.returnValue(
      of([
        {
          id: 1,
          codigo: 'PC-1',
          idLocal: 9,
          localCodigo: 'LOC-9',
          formatoDimensao: '9x3',
          valorPadrao: 500,
          fonteOrigem: 1,
          statusExibicao: StatusExibicao.AprovacaoPendente,
        },
      ])
    );

    fixture.componentInstance.idLocal = 9;
    fixture.detectChanges();

    expect(pecaServiceSpy.listPecasByLocal).toHaveBeenCalledWith(9);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PC-1');
    expect(text).toContain('9x3');
    expect(text).toContain('Aguardando aprovação');
  });

  it('exibe estado vazio quando o local ainda não tem peças', () => {
    pecaServiceSpy.listPecasByLocal.and.returnValue(of([]));

    fixture.componentInstance.idLocal = 9;
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.toLowerCase()).toContain('nenhuma peça');
  });
});
