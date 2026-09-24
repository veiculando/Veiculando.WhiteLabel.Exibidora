import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AurumStatCardComponent } from './aurum-stat-card.component';

@Component({
  imports: [AurumStatCardComponent],
  template: `
    <aurum-stat-card rotulo="Campanhas ativas" [valor]="valor" icone="megafone" tom="vinho">Programadas</aurum-stat-card>
    <aurum-stat-card rotulo="Demandas" class="composto">
      <span aurumStatValor class="valor-projetado">14 reservas</span>
    </aurum-stat-card>
  `,
})
class HostComponent {
  valor: string | number | null = 37;
}

describe('AurumStatCardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  it('renderiza rotulo, valor, icone e detalhe', () => {
    fixture.detectChanges();
    const card = el().querySelector('aurum-stat-card')!;
    expect(card.querySelector('.aurum-stat-card__rotulo')?.textContent?.trim()).toBe('Campanhas ativas');
    expect(card.querySelector('.aurum-stat-card__valor')?.textContent?.trim()).toBe('37');
    expect(card.querySelector('.aurum-stat-card__icone--vinho')).not.toBeNull();
    expect(card.querySelector('.aurum-stat-card__detalhe')?.textContent?.trim()).toBe('Programadas');
  });

  it('valor composto vem projetado e sem valor nem icone nao renderiza esses blocos', () => {
    fixture.detectChanges();
    const card = el().querySelector('aurum-stat-card.composto')!;
    expect(card.querySelector('.valor-projetado')?.textContent?.trim()).toBe('14 reservas');
    expect(card.querySelector('.aurum-stat-card__valor')).toBeNull();
    expect(card.querySelector('.aurum-stat-card__icone')).toBeNull();
  });

  it('valor zero ainda aparece (nao e tratado como vazio)', () => {
    fixture.componentInstance.valor = 0;
    fixture.detectChanges();
    expect(el().querySelector('.aurum-stat-card__valor')?.textContent?.trim()).toBe('0');
  });
});
