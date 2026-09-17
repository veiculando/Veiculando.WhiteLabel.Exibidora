import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AurumFilterFieldComponent } from './aurum-filter-field.component';

@Component({
  imports: [AurumFilterFieldComponent],
  template: `
    <aurum-filter-field rotulo="Status" [posicaoRotulo]="posicao">
      <select><option>Todos</option></select>
    </aurum-filter-field>
  `,
})
class HostComponent {
  posicao: 'embutido' | 'acima' = 'embutido';
}

describe('AurumFilterFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  it('associa o rotulo ao controle projetado (label + for/id ou wrapping)', () => {
    fixture.detectChanges();
    const label = (fixture.nativeElement as HTMLElement).querySelector('label');
    expect(label?.textContent).toContain('Status');
    expect(label?.querySelector('select')).toBeTruthy();
  });

  it('modo embutido nao aplica a classe de rotulo acima', () => {
    fixture.detectChanges();
    const root = (fixture.nativeElement as HTMLElement).querySelector('.aurum-filter-field');
    expect(root?.classList.contains('aurum-filter-field--acima')).toBe(false);
  });

  it('modo acima (Programacao) aplica a classe correspondente, rotulo em caixa alta', () => {
    fixture.componentInstance.posicao = 'acima';
    fixture.detectChanges();
    const root = (fixture.nativeElement as HTMLElement).querySelector('.aurum-filter-field');
    expect(root?.classList.contains('aurum-filter-field--acima')).toBe(true);
  });

  it('projeta o controle informado', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('select')).toBeTruthy();
  });
});
