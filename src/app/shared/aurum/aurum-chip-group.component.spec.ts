import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AurumChipGroupComponent, AurumChipOpcao } from './aurum-chip-group.component';

@Component({
  imports: [AurumChipGroupComponent],
  template: `<aurum-chip-group [rotulo]="rotulo" [opcoes]="opcoes" [(valor)]="valor" />`,
})
class HostComponent {
  rotulo = 'Status';
  valor = '';
  opcoes: AurumChipOpcao[] = [
    { valor: '', rotulo: 'Todos' },
    { valor: 'ativo', rotulo: 'Ativo' },
    { valor: 'inativo', rotulo: 'Inativo' },
  ];
}

describe('AurumChipGroupComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const chips = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  it('renderiza o prefixo e uma pilula por opcao, com a ativa marcada', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Status:');
    expect(chips().map((c) => c.textContent?.trim())).toEqual(['Todos', 'Ativo', 'Inativo']);
    expect(chips()[0].getAttribute('aria-checked')).toBe('true');
    expect(chips()[0].classList.contains('aurum-chip-group__chip--ativo')).toBe(true);
  });

  it('clique emite o valor da opcao para quem hospeda', () => {
    fixture.detectChanges();
    chips()[1].click();
    expect(fixture.componentInstance.valor).toBe('ativo');
  });

  it('sem rotulo nao renderiza o prefixo', () => {
    fixture.componentInstance.rotulo = '';
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(':');
  });
});
