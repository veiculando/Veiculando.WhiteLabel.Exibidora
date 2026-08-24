import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideRouter } from '@angular/router';
import { LocalWizardComponent } from './local-wizard.component';
import { LocalService } from '../services/local.service';
import { LocalPublicoService } from '../services/local-publico.service';
import { StatusExibicao } from '../models/status-exibicao.enum';
import { emptyLocalPublicoPayload } from '../models/local-publico.model';

describe('LocalWizardComponent', () => {
  let fixture: ComponentFixture<LocalWizardComponent>;
  let localServiceSpy: jasmine.SpyObj<LocalService>;
  let publicoServiceSpy: jasmine.SpyObj<LocalPublicoService>;

  async function setup(params: Record<string, string>): Promise<void> {
    localServiceSpy = jasmine.createSpyObj('LocalService', ['getLocal', 'createLocal', 'updateLocal']);
    publicoServiceSpy = jasmine.createSpyObj('LocalPublicoService', ['getPublico', 'savePublico']);

    await TestBed.configureTestingModule({
      imports: [LocalWizardComponent],
      providers: [
        { provide: LocalService, useValue: localServiceSpy },
        { provide: LocalPublicoService, useValue: publicoServiceSpy },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params) } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LocalWizardComponent);
  }

  it('na criação, somente a etapa "Dados do Local" fica habilitada', async () => {
    await setup({});
    fixture.detectChanges();

    expect(fixture.componentInstance.etapasHabilitadas()).toEqual([true, false, false]);
  });

  it('ao salvar Dados do Local em modo criação, chama createLocal e habilita as demais etapas', async () => {
    await setup({});
    localServiceSpy.createLocal.and.returnValue(
      of({
        id: 10,
        codigo: 'LOC-10',
        statusExibicao: StatusExibicao.AprovacaoPendente,
        cidade: 'São Paulo',
        idCidade: 1,
        codigoInterno: null,
        descricao: null,
        cep: null,
        logradouro: 'Rua A',
        numero: null,
        bairro: null,
        complemento: null,
        referencia: null,
        latitude: -23.5,
        longitude: -46.6,
        palavrasChave: null,
      })
    );
    fixture.detectChanges();

    fixture.componentInstance.onSalvarDados({
      idCidade: 1,
      codigoInterno: null,
      descricao: null,
      cep: null,
      logradouro: 'Rua A',
      numero: null,
      bairro: null,
      complemento: null,
      referencia: null,
      latitude: -23.5,
      longitude: -46.6,
      palavrasChave: null,
    });

    expect(localServiceSpy.createLocal).toHaveBeenCalled();
    expect(localServiceSpy.updateLocal).not.toHaveBeenCalled();
    expect(fixture.componentInstance.etapasHabilitadas()).toEqual([true, true, true]);
    expect(fixture.componentInstance.idLocal()).toBe(10);
  });

  it('em modo edição, carrega Local e Demografia via getLocal/getPublico e chama updateLocal ao salvar a etapa 1', async () => {
    await setup({ id: '7' });
    localServiceSpy.getLocal.and.returnValue(
      of({
        id: 7,
        codigo: 'LOC-7',
        statusExibicao: StatusExibicao.Ativo,
        cidade: 'Santos',
        idCidade: 2,
        codigoInterno: 'INT-7',
        descricao: null,
        cep: null,
        logradouro: 'Av. B',
        numero: null,
        bairro: null,
        complemento: null,
        referencia: null,
        latitude: -23,
        longitude: -46,
        palavrasChave: null,
      })
    );
    publicoServiceSpy.getPublico.and.returnValue(of(emptyLocalPublicoPayload()));
    localServiceSpy.updateLocal.and.returnValue(of({} as any));

    fixture.detectChanges();

    expect(localServiceSpy.getLocal).toHaveBeenCalledWith(7);
    expect(fixture.componentInstance.etapasHabilitadas()).toEqual([true, true, true]);

    fixture.componentInstance.onSalvarDados({
      idCidade: 2,
      codigoInterno: 'INT-7',
      descricao: null,
      cep: null,
      logradouro: 'Av. B Editada',
      numero: null,
      bairro: null,
      complemento: null,
      referencia: null,
      latitude: -23,
      longitude: -46,
      palavrasChave: null,
    });

    expect(localServiceSpy.updateLocal).toHaveBeenCalledWith(7, jasmine.objectContaining({ logradouro: 'Av. B Editada' }));
  });

  it('ao salvar a etapa de Demografia, chama LocalPublicoService.savePublico — nunca LocalService', async () => {
    await setup({ id: '7' });
    localServiceSpy.getLocal.and.returnValue(
      of({
        id: 7,
        codigo: 'LOC-7',
        statusExibicao: StatusExibicao.Ativo,
        cidade: 'Santos',
        idCidade: 2,
        codigoInterno: 'INT-7',
        descricao: null,
        cep: null,
        logradouro: 'Av. B',
        numero: null,
        bairro: null,
        complemento: null,
        referencia: null,
        latitude: -23,
        longitude: -46,
        palavrasChave: null,
      })
    );
    publicoServiceSpy.getPublico.and.returnValue(of(emptyLocalPublicoPayload()));
    publicoServiceSpy.savePublico.and.returnValue(of(emptyLocalPublicoPayload()));

    fixture.detectChanges();
    fixture.componentInstance.onSalvarDemografia(emptyLocalPublicoPayload());

    expect(publicoServiceSpy.savePublico).toHaveBeenCalledWith(7, emptyLocalPublicoPayload());
    expect(localServiceSpy.updateLocal).not.toHaveBeenCalled();
  });

  it('quando o local pertence a outro tenant (404), exibe "não encontrado" e não tenta renderizar o formulário', async () => {
    await setup({ id: '999' });
    localServiceSpy.getLocal.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    fixture.detectChanges();

    expect(fixture.componentInstance.naoEncontrado()).toBeTrue();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.toLowerCase()).toContain('não encontrado');
  });
});
