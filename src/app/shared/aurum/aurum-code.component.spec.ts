import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AurumCodeComponent } from './aurum-code.component';

@Component({
  imports: [AurumCodeComponent],
  template: `<aurum-code>SJC-LED-0142</aurum-code>`,
})
class HostComponent {}

describe('AurumCodeComponent', () => {
  it('projeta o codigo com a classe do chip monoespacado', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const code = (fixture.nativeElement as HTMLElement).querySelector('aurum-code')!;
    expect(code.classList.contains('aurum-code')).toBe(true);
    expect(code.textContent?.trim()).toBe('SJC-LED-0142');
  });
});
