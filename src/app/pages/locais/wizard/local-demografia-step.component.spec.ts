import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocalDemografiaStepComponent } from './local-demografia-step.component';
import { LocalPublicoPayload } from '../models/local-publico.model';

describe('LocalDemografiaStepComponent', () => {
  let fixture: ComponentFixture<LocalDemografiaStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalDemografiaStepComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(LocalDemografiaStepComponent);
    fixture.detectChanges();
  });

  it('ao salvar, emite somente campos de demografia — nunca endereço/geolocalização/código interno', () => {
    let emitido: LocalPublicoPayload | undefined;
    fixture.componentInstance.salvar.subscribe((p: LocalPublicoPayload) => (emitido = p));

    fixture.componentInstance.form.patchValue({ audiencia: 1500, tipoMedicao: 2 });
    fixture.componentInstance.onSubmit();

    expect(emitido).toBeTruthy();
    expect(emitido!.audiencia).toBe(1500);
    expect(Object.keys(emitido as object)).not.toContain('logradouro');
    expect(Object.keys(emitido as object)).not.toContain('latitude');
    expect(Object.keys(emitido as object)).not.toContain('codigoInterno');
  });

  it('arrays demográficos nunca são enviados como null', () => {
    let emitido: LocalPublicoPayload | undefined;
    fixture.componentInstance.salvar.subscribe((p: LocalPublicoPayload) => (emitido = p));

    fixture.componentInstance.onSubmit();

    expect(emitido!.faixaEtaria).toEqual([]);
    expect(emitido!.faixaRenda).toEqual([]);
    expect(emitido!.perfisPsicograficos).toEqual([]);
  });
});
