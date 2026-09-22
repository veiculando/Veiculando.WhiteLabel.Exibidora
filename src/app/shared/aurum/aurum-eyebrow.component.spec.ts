import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AurumEyebrowComponent } from './aurum-eyebrow.component';

describe('AurumEyebrowComponent', () => {
  let fixture: ComponentFixture<AurumEyebrowComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AurumEyebrowComponent] });
    fixture = TestBed.createComponent(AurumEyebrowComponent);
  });

  it('renderiza o texto do eyebrow', () => {
    fixture.componentInstance.texto = 'Comercial';
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('Comercial');
  });

  it('nao renderiza nada quando o texto esta vazio', () => {
    fixture.componentInstance.texto = '';
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('span')).toBeNull();
  });
});
