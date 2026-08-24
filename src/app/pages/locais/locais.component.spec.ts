import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { LocaisComponent } from './locais.component';
import { LocalService } from './services/local.service';
import { StatusExibicao } from './models/status-exibicao.enum';
import { LocalListResponse } from './models/local.model';

describe('LocaisComponent', () => {
  let fixture: ComponentFixture<LocaisComponent>;
  let localServiceSpy: jasmine.SpyObj<LocalService>;

  const response: LocalListResponse = {
    items: [
      {
        id: 1,
        codigo: 'LOC-1',
        codigoInterno: 'INT-1',
        cidade: 'São Paulo',
        endereco: 'Av. Paulista, 1000',
        numeroPecas: 2,
        statusExibicao: StatusExibicao.AprovacaoPendente,
        dataCadastro: '2026-08-01T00:00:00Z',
        dataAtualizacao: '2026-08-01T00:00:00Z',
      },
      {
        id: 2,
        codigo: 'LOC-2',
        codigoInterno: null,
        cidade: 'Santos',
        endereco: 'Av. Ana Costa, 200',
        numeroPecas: 0,
        statusExibicao: StatusExibicao.Ativo,
        dataCadastro: '2026-08-01T00:00:00Z',
        dataAtualizacao: '2026-08-01T00:00:00Z',
      },
    ],
    page: 1,
    pageSize: 20,
    totalItems: 2,
    totalPages: 1,
  };

  async function setup(): Promise<void> {
    localServiceSpy = jasmine.createSpyObj('LocalService', ['listLocais']);
    await TestBed.configureTestingModule({
      imports: [LocaisComponent],
      providers: [{ provide: LocalService, useValue: localServiceSpy }, provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(LocaisComponent);
  }

  it('exibe "Aguardando aprovação" para local com StatusExibicao.AprovacaoPendente', async () => {
    await setup();
    localServiceSpy.listLocais.and.returnValue(of(response));

    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Aguardando aprovação');
    expect(text).toContain('Ativo');
  });

  it('busca aplica o termo digitado ao chamar listLocais (isolamento fica a cargo do BFF/Host)', async () => {
    await setup();
    localServiceSpy.listLocais.and.returnValue(of(response));
    fixture.detectChanges();

    fixture.componentInstance.buscar('paulista');

    expect(localServiceSpy.listLocais).toHaveBeenCalledWith(
      jasmine.objectContaining({ busca: 'paulista' })
    );
  });

  it('em erro de carga, exibe estado de erro genérico sem expor dados parciais', async () => {
    await setup();
    localServiceSpy.listLocais.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );

    fixture.detectChanges();

    expect(fixture.componentInstance.erro()).toBeTrue();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.toLowerCase()).toContain('erro');
  });
});
