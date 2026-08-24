import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { PecaFormComponent } from './peca-form.component';
import { PecaService } from '../services/peca.service';
import { PecaDetalhe } from '../models/peca.model';
import { StatusExibicao } from '../models/status-exibicao.enum';

describe('PecaFormComponent', () => {
  let fixture: ComponentFixture<PecaFormComponent>;
  let pecaServiceSpy: jasmine.SpyObj<PecaService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const pecaBase: PecaDetalhe = {
    id: 1,
    idLocal: 9,
    idTipoSuporte: 1,
    codigoInterno: null,
    periodicidadePadrao: 1,
    valorPadrao: 100,
    idFormato: 2,
    formatoLargura: 3,
    formatoAltura: 2,
    formatoJuncao: 0,
    especificacaoLargura: null,
    especificacaoAltura: null,
    especificacaoMaterial: null,
    especificacaoTexto: null,
    idsSubstratoTipo: [],
    iluminacao: false,
    semaforo: false,
    anguloDeVisao: 90,
    viaTipo: 0,
    viaFaixas: 2,
    viaVelocidade: 60,
    viaPedestre: 0,
    roteiroComercial: false,
    alvara: false,
    streetView: null,
    descricao: null,
    restricao: null,
    codigo: 'PC-1',
    statusExibicao: StatusExibicao.AprovacaoPendente,
    fotoUrl: null,
  };

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
    pecaServiceSpy.createPeca.and.returnValue(of(undefined));

    fixture.componentInstance.form.patchValue({
      idTipoSuporte: 1,
      idFormato: 2,
      formatoLargura: 3,
      formatoAltura: 2,
      periodicidadePadrao: 1,
      valorPadrao: 100,
      anguloDeVisao: 90,
      viaFaixas: 2,
      viaVelocidade: 60,
    });
    fixture.componentInstance.onSubmit();

    expect(pecaServiceSpy.createPeca).toHaveBeenCalledWith(jasmine.objectContaining({ idLocal: 9 }));
  });

  it('não submete (nem chama o serviço) enquanto campos estruturados obrigatórios (Via, Formato) faltarem', async () => {
    await setup({ idLocal: '9' });
    pecaServiceSpy.createPeca.and.returnValue(of(undefined));

    fixture.componentInstance.form.patchValue({ idTipoSuporte: 1 });
    fixture.componentInstance.onSubmit();

    expect(pecaServiceSpy.createPeca).not.toHaveBeenCalled();
  });

  it('em modo edição (idPeca na rota), carrega a peça e chama updatePeca ao submeter', async () => {
    pecaServiceSpy = jasmine.createSpyObj('PecaService', ['getPeca', 'createPeca', 'updatePeca']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    pecaServiceSpy.getPeca.and.returnValue(of({ ...pecaBase, id: 3, codigoInterno: 'PC-INT', valorPadrao: 200 }));
    pecaServiceSpy.updatePeca.and.returnValue(of(undefined));

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
