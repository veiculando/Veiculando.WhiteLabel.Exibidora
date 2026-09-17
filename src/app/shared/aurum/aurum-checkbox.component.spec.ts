import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AurumCheckboxComponent } from './aurum-checkbox.component';

describe('AurumCheckboxComponent', () => {
  let fixture: ComponentFixture<AurumCheckboxComponent>;
  let component: AurumCheckboxComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AurumCheckboxComponent] });
    fixture = TestBed.createComponent(AurumCheckboxComponent);
    component = fixture.componentInstance;
    component.rotulo = 'Selecionar peça BER-0301';
  });

  it('associa o rotulo textual ao input, mesmo quando visualmente oculto', () => {
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    expect(input.getAttribute('aria-label')).toBe('Selecionar peça BER-0301');
  });

  it('reflete o estado marcado', () => {
    component.marcado = true;
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    expect(input.checked).toBe(true);
  });

  it('emite marcadoChange ao alternar', () => {
    fixture.detectChanges();
    const emitidos: boolean[] = [];
    component.marcadoChange.subscribe((v) => emitidos.push(v));

    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    input.click();

    expect(emitidos).toEqual([true]);
  });

  it('suporta estado indeterminado (selecao parcial em "selecionar todos")', () => {
    component.indeterminado = true;
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    expect(input.indeterminate).toBe(true);
  });
});
