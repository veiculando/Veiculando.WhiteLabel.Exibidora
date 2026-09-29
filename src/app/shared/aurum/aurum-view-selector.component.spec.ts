import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AurumViewSelectorComponent } from './aurum-view-selector.component';

describe('AurumViewSelectorComponent', () => {
  let fixture: ComponentFixture<AurumViewSelectorComponent>;
  let component: AurumViewSelectorComponent;

  function botoes(): HTMLButtonElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button[role="radio"]')
    );
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [AurumViewSelectorComponent] });
    fixture = TestBed.createComponent(AurumViewSelectorComponent);
    component = fixture.componentInstance;
    component.storageKey = 'locais';
  });

  it('renderiza um radiogroup com dois radios rotulados e com estado acessivel', () => {
    fixture.detectChanges();
    const root = (fixture.nativeElement as HTMLElement).querySelector('[role="radiogroup"]')!;
    expect(root).toBeTruthy();
    expect(root.getAttribute('aria-label')).toBeTruthy();

    const [lista, card] = botoes();
    expect(botoes().length).toBe(2);
    expect(lista.getAttribute('aria-label')).toBeTruthy();
    expect(card.getAttribute('aria-label')).toBeTruthy();
    expect(lista.getAttribute('aria-checked')).toBe('true');
    expect(card.getAttribute('aria-checked')).toBe('false');
  });

  it('clicar no botao Card alterna o modo e emite modoChange', () => {
    fixture.detectChanges();
    const emitidos: string[] = [];
    component.modoChange.subscribe((m) => emitidos.push(m));

    const [, card] = botoes();
    card.click();
    fixture.detectChanges();

    expect(component.modo).toBe('card');
    expect(emitidos).toEqual(['card']);
    expect(botoes()[1].getAttribute('aria-checked')).toBe('true');
    expect(botoes()[0].getAttribute('aria-checked')).toBe('false');
  });

  it('e alternavel apenas por teclado, com as setas, sem exigir clique', () => {
    fixture.detectChanges();
    const root = (fixture.nativeElement as HTMLElement).querySelector('[role="radiogroup"]')!;

    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(component.modo).toBe('card');

    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();
    expect(component.modo).toBe('lista');
  });

  describe('roving tabindex (D12)', () => {
    let host: HTMLElement;

    // Anexado ao document para o foco ser real; autoDetect para que
    // whenStable() renderize cada troca (sem um segundo detectChanges()).
    beforeEach(async () => {
      host = fixture.nativeElement as HTMLElement;
      document.body.appendChild(host);
      fixture.autoDetectChanges();
      await fixture.whenStable();
    });

    afterEach(() => host.remove());

    function teclar(alvo: HTMLElement, key: string): void {
      alvo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    }

    it('so o radio marcado entra na ordem de Tab', () => {
      const [lista, card] = botoes();
      expect(lista.getAttribute('tabindex')).toBe('0');
      expect(card.getAttribute('tabindex')).toBe('-1');
    });

    it('a seta move o foco junto com a selecao e o tabindex acompanha', async () => {
      const [lista, card] = botoes();
      lista.focus();

      teclar(lista, 'ArrowRight');
      await fixture.whenStable();

      expect(component.modo).toBe('card');
      expect(document.activeElement).toBe(card);
      expect(card.getAttribute('tabindex')).toBe('0');
      expect(lista.getAttribute('tabindex')).toBe('-1');
    });

    it('Space logo apos a seta nao desfaz a escolha', async () => {
      const [lista] = botoes();
      lista.focus();

      teclar(lista, 'ArrowDown');
      (document.activeElement as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(component.modo).toBe('card');
      expect(localStorage.getItem('aurum-view-selector:locais')).toBe('card');
    });

    it('Home e End vao ao primeiro e ao ultimo radio', async () => {
      const [lista, card] = botoes();
      lista.focus();

      teclar(lista, 'End');
      await fixture.whenStable();
      expect(component.modo).toBe('card');
      expect(document.activeElement).toBe(card);

      teclar(card, 'Home');
      await fixture.whenStable();
      expect(component.modo).toBe('lista');
      expect(document.activeElement).toBe(lista);
    });
  });

  it('persiste a escolha em localStorage por rota (storageKey), nao no banco', () => {
    fixture.detectChanges();
    botoes()[1].click();
    fixture.detectChanges();

    expect(localStorage.getItem('aurum-view-selector:locais')).toBe('card');
  });

  it('ao recriar o componente para a mesma rota, reabre na visao persistida', () => {
    localStorage.setItem('aurum-view-selector:locais', 'card');

    fixture.detectChanges();

    expect(component.modo).toBe('card');
    expect(botoes()[1].getAttribute('aria-checked')).toBe('true');
  });

  it('a escolha de uma rota nao vaza para outra (chaves de storage isoladas)', () => {
    localStorage.setItem('aurum-view-selector:agencias', 'card');

    fixture.detectChanges();

    expect(component.modo).toBe('lista');
  });

  it('nao dispara modoChange na inicializacao, so na troca efetiva', () => {
    const emitidos: string[] = [];
    component.modoChange.subscribe((m) => emitidos.push(m));

    fixture.detectChanges();

    expect(emitidos).toEqual([]);
  });

  it('modo salvo no storage e emitido para quem hospeda, que decide o que renderizar', async () => {
    localStorage.setItem('aurum-view-selector:locais', 'card');
    const emitidos: string[] = [];
    component.modoChange.subscribe((m) => emitidos.push(m));
    fixture.detectChanges();
    await Promise.resolve();
    expect(emitidos).toEqual(['card']);
  });
});
