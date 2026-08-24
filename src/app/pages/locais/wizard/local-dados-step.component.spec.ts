import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocalDadosStepComponent } from './local-dados-step.component';
import { LocalDadosPayload } from '../models/local.model';

describe('LocalDadosStepComponent', () => {
  let fixture: ComponentFixture<LocalDadosStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalDadosStepComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(LocalDadosStepComponent);
    fixture.detectChanges();
  });

  it('ao salvar, emite somente campos de "Dados do Local" — nunca campos de demografia', () => {
    let emitido: LocalDadosPayload | undefined;
    fixture.componentInstance.salvar.subscribe((p: LocalDadosPayload) => (emitido = p));

    fixture.componentInstance.form.patchValue({
      idCidade: 3,
      logradouro: 'Rua das Flores',
      latitude: -23.5,
      longitude: -46.6,
    });
    fixture.componentInstance.onSubmit();

    expect(emitido).toBeTruthy();
    expect(emitido!.idCidade).toBe(3);
    expect(emitido!.logradouro).toBe('Rua das Flores');
    expect(Object.keys(emitido as object)).not.toContain('genero');
    expect(Object.keys(emitido as object)).not.toContain('audienciaDia');
  });

  it('não emite quando cidade, logradouro, latitude ou longitude estão ausentes (obrigatórios)', () => {
    let chamado = false;
    fixture.componentInstance.salvar.subscribe(() => (chamado = true));

    fixture.componentInstance.onSubmit();

    expect(chamado).toBeFalse();
  });

  it('pré-carrega valores existentes via @Input valorInicial', () => {
    fixture.componentInstance.valorInicial = {
      idCidade: 5,
      codigoInterno: 'INT-9',
      descricao: null,
      cep: null,
      logradouro: 'Av. Central',
      numero: null,
      bairro: null,
      complemento: null,
      referencia: null,
      latitude: -22,
      longitude: -47,
      palavrasChave: null,
    };
    fixture.componentInstance.ngOnChanges();

    expect(fixture.componentInstance.form.value.logradouro).toBe('Av. Central');
  });
});
