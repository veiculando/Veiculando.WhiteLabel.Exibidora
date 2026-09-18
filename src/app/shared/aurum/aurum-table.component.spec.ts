import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from './aurum-table.component';

@Component({
  imports: [
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
  ],
  template: `
    <table aurumTable>
      <thead>
        <tr aurumTableRow>
          <th aurumTableHeaderCell>Código</th>
        </tr>
      </thead>
      <tbody>
        <tr aurumTableRow>
          <td aurumTableCell>SJC-LED-0142</td>
        </tr>
      </tbody>
    </table>
  `,
})
class HostComponent {}

describe('Aurum Table primitives', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('mantem a estrutura semantica nativa de tabela (table/tr/th/td)', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('table')).toBeTruthy();
    expect(root.querySelector('thead tr th')).toBeTruthy();
    expect(root.querySelector('tbody tr td')).toBeTruthy();
  });

  it('projeta o conteudo das celulas', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('th')?.textContent?.trim()).toBe('Código');
    expect(root.querySelector('td')?.textContent?.trim()).toBe('SJC-LED-0142');
  });

  it('header cell recebe a classe de estilo caixa-alta do design system', () => {
    const th = (fixture.nativeElement as HTMLElement).querySelector('th')!;
    expect(th.classList.contains('aurum-table__header-cell')).toBe(true);
  });

  it('table e as rows recebem as classes do design system', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('table')?.classList.contains('aurum-table')).toBe(true);
    expect(root.querySelectorAll('tr.aurum-table__row').length).toBe(2);
  });
});
