import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AurumStatusPillComponent } from './aurum-status-pill.component';

describe('AurumStatusPillComponent', () => {
  let fixture: ComponentFixture<AurumStatusPillComponent>;
  let component: AurumStatusPillComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AurumStatusPillComponent] });
    fixture = TestBed.createComponent(AurumStatusPillComponent);
    component = fixture.componentInstance;
  });

  it('sempre renderiza o rotulo textual do status, nunca so a cor (PRD secao 7)', () => {
    component.rotulo = 'Aprovado';
    component.tom = 'sucesso';
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('Aprovado');
  });

  it('aplica a classe do tom semantico informado', () => {
    component.rotulo = 'Rejeitado';
    component.tom = 'perigo';
    fixture.detectChanges();
    const pill = (fixture.nativeElement as HTMLElement).querySelector('.aurum-status-pill');
    expect(pill?.classList.contains('aurum-status-pill--perigo')).toBe(true);
  });

  it('tom padrao e neutro quando nao informado', () => {
    component.rotulo = 'Rascunho';
    fixture.detectChanges();
    const pill = (fixture.nativeElement as HTMLElement).querySelector('.aurum-status-pill');
    expect(pill?.classList.contains('aurum-status-pill--neutro')).toBe(true);
  });

  it('compacto aplica o Status Tag de linha (11px) sem trocar o tom', () => {
    component.rotulo = 'Ativo';
    component.tom = 'sucesso';
    component.compacto = true;
    fixture.detectChanges();
    const pill = (fixture.nativeElement as HTMLElement).querySelector('.aurum-status-pill')!;
    expect(pill.classList.contains('aurum-status-pill--compacto')).toBe(true);
    expect(pill.classList.contains('aurum-status-pill--sucesso')).toBe(true);
  });

  it('tons solidos da grade de Programacao/OS usam a classe solido-*', () => {
    component.rotulo = 'Atribuída';
    component.tom = 'solido-azul';
    fixture.detectChanges();
    const pill = (fixture.nativeElement as HTMLElement).querySelector('.aurum-status-pill')!;
    expect(pill.classList.contains('aurum-status-pill--solido-azul')).toBe(true);
    expect(pill.textContent?.trim()).toBe('Atribuída');
  });
});
