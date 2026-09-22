import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AurumHistoryCardComponent } from './aurum-history-card.component';

describe('AurumHistoryCardComponent', () => {
  let fixture: ComponentFixture<AurumHistoryCardComponent>;
  let component: AurumHistoryCardComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AurumHistoryCardComponent] });
    fixture = TestBed.createComponent(AurumHistoryCardComponent);
    component = fixture.componentInstance;
  });

  it('renderiza cada evento com timestamp e autor, na ordem recebida (append-only)', () => {
    component.eventos = [
      { evento: 'OS gerada com 3 peças selecionadas', timestamp: '10/08/2026 09:20', autor: 'Rafael Andrade' },
      { evento: 'Entrega confirmada (PDF)', timestamp: '10/08/2026 14:05', autor: 'Rafael Andrade' },
    ];
    fixture.detectChanges();

    const itens = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('li'));
    expect(itens.length).toBe(2);
    expect(itens[0].textContent).toContain('OS gerada com 3 peças selecionadas');
    expect(itens[0].textContent).toContain('10/08/2026 09:20');
    expect(itens[0].textContent).toContain('Rafael Andrade');
  });

  it('mostra um estado vazio quando ainda nao ha eventos, sem quebrar o layout', () => {
    component.eventos = [];
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('li').length).toBe(0);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nenhum evento');
  });
});
