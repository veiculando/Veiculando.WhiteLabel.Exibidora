import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { PecaFormComponent } from './peca-form.component';
import { PecaService } from '../services/peca.service';
import { StatusExibicao } from '../models/status-exibicao.enum';

describe('PecaFormComponent', () => {
  let fixture: ComponentFixture<PecaFormComponent>;
  let pecaServiceSpy: jasmine.SpyObj<PecaService>;
  let routerSpy: jasmine.SpyObj<Router>;

  async function setup(params: Record<string, string>): Promise<void> {
    pecaServiceSpy = jasmine.createSpyObj('PecaService', ['getPeca', 'createPeca', 'updatePeca']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [PecaFormComponent],
      providers: [
        { provide: PecaService, useValue: pecaServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(params) } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PecaFormComponent);
    fixture.detectChanges();
  }

  it('CTA de foto fica desabilitado com mensagem, nunca prometendo sucesso (endpoint 501)', async () => {
    await setup({ idLocal: '9' });

    const btn: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-testid="upload-foto-btn"]'
    );
    expect(btn?.disabled).toBeTrue();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.toLowerCase()).toContain('envio de foto indisponível');
    expect(text.toLowerCase()).not.toContain('foto enviada com sucesso');
  });

  it('em modo criação, idLocal vem da rota e nunca fica editável no formulário', async () => {
    await setup({ idLocal: '9' });

    expect(fixture.componentInstance.idLocal).toBe(9);
    const campoIdLocal = fixture.nativeElement.querySelector('input[formControlName="idLocal"]');
    expect(campoIdLocal).toBeNull();
  });

  it('ao submeter em modo criação, chama pecaService.createPeca com idLocal fixo da rota', async () => {
    await setup({ idLocal: '9' });
    pecaServiceSpy.createPeca.and.returnValue(
      of({
        id: 1,
        idLocal: 9,
        idTipoSuporte: 1,
        codigoInterno: null,
        periodicidadePadrao: 1,
        valorPadrao: 100,
        idFormato: 2,
        especificacaoProducao: null,
        substratos: null,
        iluminacao: false,
        semaforo: false,
        anguloDeVisao: null,
        via: null,
        roteiroComercial: null,
        alvara: null,
        streetView: null,
        descricao: null,
        restricao: null,
        codigo: 'PC-1',
        statusExibicao: StatusExibicao.AprovacaoPendente,
        fotoUrl: null,
      })
    );

    fixture.componentInstance.form.patchValue({
      idTipoSuporte: 1,
      idFormato: 2,
      periodicidadePadrao: 1,
      valorPadrao: 100,
    });
    fixture.componentInstance.onSubmit();

    expect(pecaServiceSpy.createPeca).toHaveBeenCalledWith(jasmine.objectContaining({ idLocal: 9 }));
  });

  it('em modo edição (idPeca na rota), carrega a peça e chama updatePeca ao submeter', async () => {
    pecaServiceSpy = jasmine.createSpyObj('PecaService', ['getPeca', 'createPeca', 'updatePeca']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    pecaServiceSpy.getPeca.and.returnValue(
      of({
        id: 3,
        idLocal: 9,
        idTipoSuporte: 1,
        codigoInterno: 'PC-INT',
        periodicidadePadrao: 1,
        valorPadrao: 200,
        idFormato: 2,
        especificacaoProducao: null,
        substratos: null,
        iluminacao: true,
        semaforo: false,
        anguloDeVisao: null,
        via: null,
        roteiroComercial: null,
        alvara: null,
        streetView: null,
        descricao: null,
        restricao: null,
        codigo: 'PC-1',
        statusExibicao: StatusExibicao.Ativo,
        fotoUrl: null,
      })
    );
    pecaServiceSpy.updatePeca.and.returnValue(of({} as any));

    await TestBed.configureTestingModule({
      imports: [PecaFormComponent],
      providers: [
        { provide: PecaService, useValue: pecaServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ idLocal: '9', idPeca: '3' }) } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PecaFormComponent);
    fixture.detectChanges();

    expect(pecaServiceSpy.getPeca).toHaveBeenCalledWith(3);
    expect(fixture.componentInstance.form.value.codigoInterno).toBe('PC-INT');

    fixture.componentInstance.onSubmit();

    expect(pecaServiceSpy.updatePeca).toHaveBeenCalledWith(3, jasmine.objectContaining({ idLocal: 9 }));
  });
});
