import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AurumCardComponent,
  AurumDividerComponent,
  AurumSurfaceComponent,
} from './aurum-card.component';

@Component({
  imports: [AurumCardComponent, AurumSurfaceComponent, AurumDividerComponent],
  template: `
    <aurum-card>Conteúdo do card</aurum-card>
    <aurum-surface>Conteúdo da surface</aurum-surface>
    <hr aurumDivider />
  `,
})
class HostComponent {}

describe('Aurum Card/Surface/Divider', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('card projeta conteudo e aplica a classe de elevacao', () => {
    const card = (fixture.nativeElement as HTMLElement).querySelector('aurum-card')!;
    expect(card.textContent?.trim()).toBe('Conteúdo do card');
    expect(card.classList.contains('aurum-card')).toBe(true);
  });

  it('surface projeta conteudo sem elevacao (fundo plano)', () => {
    const surface = (fixture.nativeElement as HTMLElement).querySelector('aurum-surface')!;
    expect(surface.textContent?.trim()).toBe('Conteúdo da surface');
    expect(surface.classList.contains('aurum-surface')).toBe(true);
  });

  it('divider e um hr semantico com a classe do design system', () => {
    const hr = (fixture.nativeElement as HTMLElement).querySelector('hr')!;
    expect(hr.classList.contains('aurum-divider')).toBe(true);
  });
});
