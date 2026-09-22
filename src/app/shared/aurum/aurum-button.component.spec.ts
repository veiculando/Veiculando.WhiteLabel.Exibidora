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
  variante: 'wine' | 'gold' | 'outline' | 'ghost' | 'perigo' = 'wine';
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

  it('variante perigo usa o tom --danger, para acoes destrutivas (ex.: excluir)', () => {
    fixture.componentInstance.variante = 'perigo';
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(btn.classList.contains('aurum-button--perigo')).toBe(true);
  });

  it('type e "button" por padrao, para nao submeter formularios sem querer', () => {
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(btn.getAttribute('type')).toBe('button');
  });
});

@Component({
  imports: [AurumButtonComponent],
  template: `<form (ngSubmit)="enviado = true"><aurum-button tipo="submit">Entrar</aurum-button></form>`,
})
class HostSubmitComponent {
  enviado = false;
}

describe('AurumButtonComponent como submit de formulario', () => {
  it('tipo="submit" propaga type=submit no button nativo dentro de um form', () => {
    // A simulacao completa (clique -> submit do form -> ngSubmit) depende de
    // HTMLFormElement.requestSubmit(), que o jsdom deste harness nao
    // implementa - limitacao do ambiente de teste, nao do componente. Em
    // qualquer browser real, type="submit" dentro de um <form> aciona o
    // submit nativamente; o que cabe testar aqui e que o atributo propaga.
    TestBed.configureTestingModule({ imports: [HostSubmitComponent] });
    const fixture = TestBed.createComponent(HostSubmitComponent);
    fixture.detectChanges();

    const btn = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(btn.getAttribute('type')).toBe('submit');
  });
});
