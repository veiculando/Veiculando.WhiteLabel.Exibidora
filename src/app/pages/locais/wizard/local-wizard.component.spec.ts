import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideRouter } from '@angular/router';
import { LocalWizardComponent } from './local-wizard.component';
import { LocalService } from '../services/local.service';
import { LocalPublicoService } from '../services/local-publico.service';
import { StatusExibicao } from '../models/status-exibicao.enum';
import { emptyLocalPublicoPayload } from '../models/local-publico.model';
import { LocalDetalhe } from '../models/local.model';
import type { Mocked } from 'vitest';

describe('LocalWizardComponent', () => {
  let fixture: ComponentFixture<LocalWizardComponent>;
  let localServiceSpy: Mocked<LocalService>;
  let publicoServiceSpy: Mocked<LocalPublicoService>;

  const localCarregado: LocalDetalhe = {
    id: 7,
    codigo: 'LOC-7',
    statusExibicao: StatusExibicao.Ativo,
    idCidade: 2,
    cidade: 'Santos',
    uf: 'SP',
    codigoInterno: 'INT-7',
    descricao: null,
    palavrasChave: null,
    endereco: {
      logradouro: 'Av. B',
      numero: null,
      bairro: null,
      complemento: null,
      referencia: null,
      cep: { numero: null },
    },
    geolocalizacao: { latitude: -23, longitude: -46 },
    fonteOrigem: 1,
    fonteUsuarioId: null,
    fonteTimestamp: null,
  };

  async function setup(params: Record<string, string>): Promise<void> {
    localServiceSpy = {
      getLocal: vi.fn(),
      createLocal: vi.fn(),
      updateLocal: vi.fn(),
    } as unknown as Mocked<LocalService>;
    publicoServiceSpy = {
      getPublico: vi.fn().mockReturnValue(of(emptyLocalPublicoPayload())),
      savePublico: vi.fn(),
    } as unknown as Mocked<LocalPublicoService>;

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

  it('confirma por GET os campos persistidos e só então mostra sucesso', async () => {
    await setup({ id: '7' });
    localServiceSpy.getLocal.mockReturnValue(of(localCarregado));
    publicoServiceSpy.getPublico.mockReturnValue(of(emptyLocalPublicoPayload()));
    localServiceSpy.updateLocal.mockReturnValue(of(null));
    fixture.detectChanges();
    fixture.componentInstance.onSalvarDados(fixture.componentInstance.dadosIniciais!);
    fixture.detectChanges();
    expect(localServiceSpy.getLocal).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Dados do local salvos e conferidos');
  });

  it('não confirma sucesso se o GET retorna dados diferentes e preserva o formulário', async () => {
    await setup({ id: '7' });
    localServiceSpy.getLocal.mockReturnValue(of(localCarregado));
    publicoServiceSpy.getPublico.mockReturnValue(of(emptyLocalPublicoPayload()));
    localServiceSpy.updateLocal.mockReturnValue(of(null));
    fixture.detectChanges();
    fixture.componentInstance.onSalvarDados({ ...fixture.componentInstance.dadosIniciais!, logradouro: 'Alterado' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('não confirmou');
    expect(fixture.nativeElement.querySelector('app-local-dados-step')).not.toBeNull();
  });

  it('bloqueia envio duplicado enquanto aguarda a gravação', async () => {
    await setup({ id: '7' });
    localServiceSpy.getLocal.mockReturnValue(of(localCarregado));
    publicoServiceSpy.getPublico.mockReturnValue(of(emptyLocalPublicoPayload()));
    const pendente = new Subject<null>();
    localServiceSpy.updateLocal.mockReturnValue(pendente);
    fixture.detectChanges();
    const payload = fixture.componentInstance.dadosIniciais!;
    fixture.componentInstance.onSalvarDados(payload);
    fixture.componentInstance.onSalvarDados(payload);
    expect(localServiceSpy.updateLocal).toHaveBeenCalledTimes(1);
    pendente.complete();
  });

  it('ao salvar Dados do Local em modo criação, chama createLocal e habilita as demais etapas', async () => {
    await setup({});
    localServiceSpy.getLocal.mockReturnValue(of({ ...localCarregado, id: 10, idCidade: 1,
      codigoInterno: null, endereco: { ...localCarregado.endereco!, logradouro: 'Rua A' },
      geolocalizacao: { latitude: -23.5, longitude: -46.6 }, statusExibicao: StatusExibicao.AprovacaoPendente }));
    localServiceSpy.createLocal.mockReturnValue(
      of({
        id: 10,
        codigo: 'LOC-10',
        codigoInterno: null,
        idAfiliada: 1,
        idCidade: 1,
        cidade: 'São Paulo',
        descricao: null,
        palavrasChave: null,
        statusExibicao: StatusExibicao.AprovacaoPendente,
        dataCadastro: '2026-08-01T00:00:00Z',
        dataAtualizacao: '2026-08-01T00:00:00Z',
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

  it('em modo edição, carrega Local (endereço/geolocalização aninhados → form flat) e Demografia, chamando updateLocal ao salvar a etapa 1', async () => {
    await setup({ id: '7' });
    localServiceSpy.getLocal.mockReturnValue(of(localCarregado));
    publicoServiceSpy.getPublico.mockReturnValue(of(emptyLocalPublicoPayload()));
    localServiceSpy.updateLocal.mockReturnValue(of(null));

    fixture.detectChanges();

    expect(localServiceSpy.getLocal).toHaveBeenCalledWith(7);
    expect(fixture.componentInstance.etapasHabilitadas()).toEqual([true, true, true]);
    expect(fixture.componentInstance.dadosIniciais?.logradouro).toBe('Av. B');
    expect(fixture.componentInstance.dadosIniciais?.latitude).toBe(-23);

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

    expect(localServiceSpy.updateLocal).toHaveBeenCalledWith(7, expect.objectContaining({ logradouro: 'Av. B Editada' }));
  });

  it('ao salvar a etapa de Demografia, chama LocalPublicoService.savePublico — nunca LocalService', async () => {
    await setup({ id: '7' });
    localServiceSpy.getLocal.mockReturnValue(of(localCarregado));
    publicoServiceSpy.getPublico.mockReturnValue(of(emptyLocalPublicoPayload()));
    publicoServiceSpy.savePublico.mockReturnValue(of(undefined));

    fixture.detectChanges();
    fixture.componentInstance.onSalvarDemografia(emptyLocalPublicoPayload());

    expect(publicoServiceSpy.savePublico).toHaveBeenCalledWith(7, emptyLocalPublicoPayload());
    expect(localServiceSpy.updateLocal).not.toHaveBeenCalled();
  });

  it('não transforma falha de demografia em formulário vazio e permite tentar novamente', async () => {
    await setup({ id: '7' });
    localServiceSpy.getLocal.mockReturnValue(of(localCarregado));
    publicoServiceSpy.getPublico.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    fixture.detectChanges();
    expect(fixture.componentInstance.demografiaInicial).toBeNull();
    expect(fixture.componentInstance.etapasHabilitadas()[1]).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar os dados demográficos');
    publicoServiceSpy.getPublico.mockReturnValue(of({ ...emptyLocalPublicoPayload(), audiencia: 12345 }));
    const retry = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(button => button.textContent?.includes('Tentar carregar demografia'))!;
    retry.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.demografiaInicial?.audiencia).toBe(12345);
    expect(fixture.componentInstance.etapasHabilitadas()[1]).toBe(true);
  });

  it('não habilita a edição demográfica enquanto a consulta inicial está pendente', async () => {
    await setup({ id: '7' });
    localServiceSpy.getLocal.mockReturnValue(of(localCarregado));
    publicoServiceSpy.getPublico.mockReturnValue(new Subject());
    fixture.detectChanges();
    expect(fixture.componentInstance.etapasHabilitadas()[1]).toBe(false);
    fixture.componentInstance.onSalvarDemografia(emptyLocalPublicoPayload());
    expect(publicoServiceSpy.savePublico).not.toHaveBeenCalled();
  });

  it.each([0, 500, 503])('falha de leitura %s não significa local inexistente e permite nova tentativa', async status => {
    await setup({ id: '7' });
    localServiceSpy.getLocal.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    fixture.detectChanges();
    expect(fixture.componentInstance.naoEncontrado()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar o local');
    expect(fixture.nativeElement.querySelector('app-local-dados-step')).toBeNull();
    expect(publicoServiceSpy.getPublico).not.toHaveBeenCalled();
    localServiceSpy.getLocal.mockReturnValue(of(localCarregado));
    const retry = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(button => button.textContent?.includes('Tentar carregar local'))!;
    retry.click();
    fixture.detectChanges();
    expect(localServiceSpy.getLocal).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.idLocal()).toBe(7);
    expect(fixture.nativeElement.querySelector('app-local-dados-step')).not.toBeNull();
  });

  it('leitura negada mostra falta de permissão sem afirmar que o local não existe', async () => {
    await setup({ id: '7' });
    localServiceSpy.getLocal.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    fixture.detectChanges();
    expect(fixture.componentInstance.naoEncontrado()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Você não tem permissão para acessar este local');
    expect(fixture.nativeElement.querySelector('app-local-dados-step')).toBeNull();
  });

  it('quando o local pertence a outro tenant (404), exibe "não encontrado" e não tenta renderizar o formulário', async () => {
    await setup({ id: '999' });
    localServiceSpy.getLocal.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    fixture.detectChanges();

    expect(fixture.componentInstance.naoEncontrado()).toBe(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.toLowerCase()).toContain('não encontrado');
  });
});
