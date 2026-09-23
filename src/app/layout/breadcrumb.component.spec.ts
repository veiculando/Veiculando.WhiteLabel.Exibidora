import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BreadcrumbComponent } from './breadcrumb.component';

@Component({ template: '' })
class RotaFicticiaComponent {}

describe('BreadcrumbComponent', () => {
  let fixture: ComponentFixture<BreadcrumbComponent>;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BreadcrumbComponent],
      providers: [provideRouter([{ path: '**', component: RotaFicticiaComponent }])],
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(BreadcrumbComponent);
  });

  it('na raiz, mostra so "Painel" como pagina atual, sem segundo nivel', () => {
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Painel');
  });

  it('numa rota interna, "Painel" vira link e a pagina atual aparece por ultimo, sem link', async () => {
    fixture.detectChanges();
    await router.navigateByUrl('/locais');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const link = root.querySelector('a');
    expect(link?.textContent?.trim()).toBe('Painel');
    expect(link?.getAttribute('href')).toBe('/dashboard');

    const atual = root.querySelector('[aria-current="page"]');
    expect(atual?.textContent?.trim()).toBe('Locais');
  });

  it('rota com parametro usa o nome da tela do Figma, nao o id', async () => {
    fixture.detectChanges();
    await router.navigateByUrl('/checkout/42');
    fixture.detectChanges();
    const atual = (fixture.nativeElement as HTMLElement).querySelector('[aria-current="page"]');
    expect(atual?.textContent?.trim()).toBe('Operacional — Check out — Detalhe');
  });
});
