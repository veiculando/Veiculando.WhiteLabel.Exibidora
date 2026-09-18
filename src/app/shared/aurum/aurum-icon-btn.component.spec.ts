import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AurumIconBtnComponent } from './aurum-icon-btn.component';

@Component({
  imports: [AurumIconBtnComponent],
  template: `<aurum-icon-btn rotulo="Editar agência" (click)="cliques = cliques + 1">
    <svg aria-hidden="true"><circle /></svg>
  </aurum-icon-btn>`,
})
class HostComponent {
  cliques = 0;
}

describe('AurumIconBtnComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('exige rotulo textual via aria-label — icone sozinho nao comunica (PRD secao 7)', () => {
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(btn.getAttribute('aria-label')).toBe('Editar agência');
  });

  it('projeta o icone e propaga o clique por bubbling', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('svg')).toBeTruthy();
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    expect(fixture.componentInstance.cliques).toBe(1);
  });
});
