import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AurumDropdownComponent } from './aurum-dropdown.component';

describe('AurumDropdownComponent', () => {
  let fixture: ComponentFixture<AurumDropdownComponent>;
  let component: AurumDropdownComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AurumDropdownComponent] });
    fixture = TestBed.createComponent(AurumDropdownComponent);
    component = fixture.componentInstance;
    component.opcoes = [
      { valor: '', rotulo: 'Todos' },
      { valor: 'ativo', rotulo: 'Ativo' },
      { valor: 'inativo', rotulo: 'Inativo' },
    ];
  });

  it('renderiza uma option por opcao, na ordem informada', () => {
    fixture.detectChanges();
    const options = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('option'));
    expect(options.map((o) => o.textContent?.trim())).toEqual(['Todos', 'Ativo', 'Inativo']);
  });

  it('reflete o valor selecionado', () => {
    component.valor = 'ativo';
    fixture.detectChanges();
    const select = (fixture.nativeElement as HTMLElement).querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('ativo');
  });

  it('emite valorChange ao selecionar outra opcao, navegavel por teclado nativamente', () => {
    fixture.detectChanges();
    const emitidos: string[] = [];
    component.valorChange.subscribe((v) => emitidos.push(v));

    const select = (fixture.nativeElement as HTMLElement).querySelector('select') as HTMLSelectElement;
    select.value = 'inativo';
    select.dispatchEvent(new Event('change'));

    expect(emitidos).toEqual(['inativo']);
  });
});
