import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AurumPeriodCellComponent } from './aurum-period-cell.component';

describe('AurumPeriodCellComponent', () => {
  let fixture: ComponentFixture<AurumPeriodCellComponent>;
  let component: AurumPeriodCellComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AurumPeriodCellComponent] });
    fixture = TestBed.createComponent(AurumPeriodCellComponent);
    component = fixture.componentInstance;
    component.status = 'reservado';
  });

  it('renderiza o rotulo do status da peca no periodo', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('reservado');
  });

  it('exibe o badge ATUAL somente quando e o periodo corrente', () => {
    component.atual = false;
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('ATUAL');

    component.atual = true;
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('ATUAL');
  });
});
