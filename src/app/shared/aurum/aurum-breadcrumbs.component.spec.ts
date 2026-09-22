import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AurumBreadcrumbsComponent } from './aurum-breadcrumbs.component';

describe('AurumBreadcrumbsComponent', () => {
  let fixture: ComponentFixture<AurumBreadcrumbsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AurumBreadcrumbsComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(AurumBreadcrumbsComponent);
    fixture.componentInstance.itens = [
      { rotulo: 'Inventário', link: '/locais' },
      { rotulo: 'Locais' },
    ];
    fixture.detectChanges();
  });

  it('renderiza uma nav rotulada com a trilha', () => {
    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav');
    expect(nav?.getAttribute('aria-label')).toBeTruthy();
  });

  it('itens com link viram anchor navegavel', () => {
    const link = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(link?.textContent?.trim()).toBe('Inventário');
    expect(link?.getAttribute('href')).toBe('/locais');
  });

  it('o ultimo item e a pagina atual: sem link e com aria-current', () => {
    const atual = (fixture.nativeElement as HTMLElement).querySelector('[aria-current="page"]');
    expect(atual?.textContent?.trim()).toBe('Locais');
    expect(atual?.tagName.toLowerCase()).not.toBe('a');
  });
});
