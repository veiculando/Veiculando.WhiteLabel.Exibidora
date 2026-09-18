import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AurumLegendItemComponent } from './aurum-legend-item.component';

describe('AurumLegendItemComponent', () => {
  let fixture: ComponentFixture<AurumLegendItemComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AurumLegendItemComponent] });
    fixture = TestBed.createComponent(AurumLegendItemComponent);
    fixture.componentInstance.rotulo = 'Reservado';
  });

  it('sempre mostra o texto do status, alem do marcador colorido (PRD secao 7)', () => {
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent?.trim();
    expect(texto).toBe('Reservado');
    expect((fixture.nativeElement as HTMLElement).querySelector('.aurum-legend-item__marcador')).toBeTruthy();
  });
});
