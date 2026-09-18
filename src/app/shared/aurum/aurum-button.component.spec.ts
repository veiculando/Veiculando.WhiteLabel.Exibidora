import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AurumButtonComponent } from './aurum-button.component';

@Component({
  imports: [AurumButtonComponent],
  template: `<aurum-button [variante]="variante" [desabilitado]="desabilitado" (click)="cliques = cliques + 1"
    >Nova Agência</aurum-button
  >`,
})
class HostComponent {
  variante: 'wine' | 'gold' | 'outline' | 'ghost' = 'wine';
  desabilitado = false;
  cliques = 0;
}

describe('AurumButtonComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  it('projeta o rotulo e aplica a classe da variante em pill uppercase', () => {
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(btn.textContent?.trim()).toBe('Nova Agência');
    expect(btn.classList.contains('aurum-button--wine')).toBe(true);
  });

  it('clique no host propaga (bubbling nativo) e dispara o handler', () => {
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    expect(fixture.componentInstance.cliques).toBe(1);
  });

  it('desabilitado bloqueia o clique nativamente', () => {
    fixture.componentInstance.desabilitado = true;
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    expect(fixture.componentInstance.cliques).toBe(0);
  });

  it('troca de variante reflete na classe (wine/gold/outline/ghost)', () => {
    fixture.componentInstance.variante = 'ghost';
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(btn.classList.contains('aurum-button--ghost')).toBe(true);
    expect(btn.classList.contains('aurum-button--wine')).toBe(false);
  });
});
