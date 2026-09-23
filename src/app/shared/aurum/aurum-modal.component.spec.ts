import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AurumModalComponent, AurumModalPosicao } from './aurum-modal.component';

@Component({
  imports: [AurumModalComponent],
  template: `
    <aurum-modal [aberto]="aberto" titulo="Editar Local" subtitulo="Associado à Afiliada" [posicao]="posicao" (fechar)="fechamentos = fechamentos + 1">
      <p class="corpo">conteudo</p>
      <button aurumModalRodape type="button" class="confirmar">Continuar</button>
    </aurum-modal>
  `,
})
class HostComponent {
  aberto = true;
  posicao: AurumModalPosicao = 'centro';
  fechamentos = 0;
}

describe('AurumModalComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  it('fechado nao renderiza o dialogo', () => {
    fixture.componentInstance.aberto = false;
    fixture.detectChanges();
    expect(el().querySelector('[role="dialog"]')).toBeNull();
  });

  it('aberto renderiza titulo rotulando o dialogo, corpo e rodape projetados', () => {
    fixture.detectChanges();
    const dialogo = el().querySelector('[role="dialog"]')!;
    const titulo = el().querySelector('h2')!;
    expect(titulo.textContent?.trim()).toBe('Editar Local');
    expect(dialogo.getAttribute('aria-labelledby')).toBe(titulo.id);
    expect(el().querySelector('.aurum-modal__corpo .corpo')).not.toBeNull();
    expect(el().querySelector('.aurum-modal__rodape .confirmar')).not.toBeNull();
  });

  it('botao fechar e clique no fundo emitem fechar; clique no painel nao', () => {
    fixture.detectChanges();
    (el().querySelector('.aurum-modal') as HTMLElement).click();
    expect(fixture.componentInstance.fechamentos).toBe(0);
    (el().querySelector('.aurum-modal__fechar') as HTMLElement).click();
    (el().querySelector('.aurum-modal__fundo') as HTMLElement).click();
    expect(fixture.componentInstance.fechamentos).toBe(2);
  });

  it('Esc emite fechar', () => {
    fixture.detectChanges();
    el().querySelector('[role="dialog"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fixture.componentInstance.fechamentos).toBe(1);
  });

  it('posicao lateral aplica a gaveta a direita', () => {
    fixture.componentInstance.posicao = 'lateral';
    fixture.detectChanges();
    expect(el().querySelector('.aurum-modal')!.classList.contains('aurum-modal--lateral')).toBe(true);
  });
});
