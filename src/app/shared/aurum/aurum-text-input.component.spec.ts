import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AurumTextInputComponent } from './aurum-text-input.component';

describe('AurumTextInputComponent', () => {
  let fixture: ComponentFixture<AurumTextInputComponent>;
  let component: AurumTextInputComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AurumTextInputComponent] });
    fixture = TestBed.createComponent(AurumTextInputComponent);
    component = fixture.componentInstance;
  });

  it('usa o placeholder como rotulo acessivel quando nenhum aria-label explicito e dado', () => {
    component.placeholder = 'Buscar por código, endereço, cidade ou tipo de suporte…';
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    expect(input.getAttribute('aria-label')).toBe('Buscar por código, endereço, cidade ou tipo de suporte…');
  });

  it('emite valorChange conforme o usuario digita', () => {
    fixture.detectChanges();
    const emitidos: string[] = [];
    component.valorChange.subscribe((v) => emitidos.push(v));

    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    input.value = 'Ímpar';
    input.dispatchEvent(new Event('input'));

    expect(emitidos).toEqual(['Ímpar']);
  });

  it('renderiza o icone de busca como decorativo (aria-hidden), sem duplicar rotulo', () => {
    fixture.detectChanges();
    const icone = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(icone?.getAttribute('aria-hidden')).toBe('true');
  });
});
