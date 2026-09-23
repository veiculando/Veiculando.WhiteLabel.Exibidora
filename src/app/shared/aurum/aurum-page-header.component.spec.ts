import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AurumPageHeaderComponent } from './aurum-page-header.component';

@Component({
  imports: [AurumPageHeaderComponent],
  template: `
    <aurum-page-header [eyebrow]="eyebrow" [titulo]="titulo" [subtitulo]="subtitulo">
      <span aurumPageHeaderBadge>8 peças</span>
      <button aurumPageHeaderAcoes type="button">Nova Agência</button>
    </aurum-page-header>
  `,
})
class HostComponent {
  eyebrow = 'Comercial';
  titulo = 'Agências';
  subtitulo = '';
}

describe('AurumPageHeaderComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  it('renderiza o titulo como h1', () => {
    fixture.detectChanges();
    const h1 = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(h1?.textContent?.trim()).toBe('Agências');
  });

  it('renderiza o eyebrow quando informado', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Comercial');
  });

  it('omite o subtitulo quando nao informado', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('p')).toBeNull();
  });

  it('projeta badge e acoes no cabecalho', () => {
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('8 peças');
    expect((fixture.nativeElement as HTMLElement).querySelector('button')?.textContent?.trim()).toBe(
      'Nova Agência'
    );
  });

  it('renderiza o subtitulo quando informado', () => {
    fixture.componentInstance.subtitulo = 'Gestão de agências e comissões';
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('p')?.textContent?.trim()).toBe(
      'Gestão de agências e comissões'
    );
  });

  it('badge por input renderiza a pilula ao lado do titulo', () => {
    const f = TestBed.createComponent(AurumPageHeaderComponent);
    f.componentInstance.titulo = 'Locais';
    f.componentInstance.badge = '8 pontos';
    f.detectChanges();
    const badge = (f.nativeElement as HTMLElement).querySelector('.aurum-page-header__badge');
    expect(badge?.textContent?.trim()).toBe('8 pontos');
  });
});
