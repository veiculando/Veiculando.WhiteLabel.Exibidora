import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { LocaisComponent } from './locais.component';
import { LocalService } from './services/local.service';
import { StatusExibicao } from './models/status-exibicao.enum';
import { LocalListItem } from './models/local.model';
import type { Mocked } from 'vitest';

describe('LocaisComponent', () => {
  let fixture: ComponentFixture<LocaisComponent>;
  let localServiceSpy: Mocked<LocalService>;

  const itens: LocalListItem[] = [
    {
      id: 1,
      codigo: 'LOC-1',
      descricao: 'Praça Central',
      cidade: 'São Paulo',
      uf: 'SP',
      fonteOrigem: 1,
      fonteTimestamp: '2026-08-01T00:00:00Z',
      statusExibicao: StatusExibicao.AprovacaoPendente,
    },
    {
      id: 2,
      codigo: 'LOC-2',
      descricao: 'Terminal Rodoviário',
      cidade: 'Santos',
      uf: 'SP',
      fonteOrigem: 1,
      fonteTimestamp: '2026-08-01T00:00:00Z',
      statusExibicao: StatusExibicao.Ativo,
    },
  ];

  async function setup(): Promise<void> {
    localServiceSpy = {
      listLocais: vi.fn(),
      deleteLocal: vi.fn(),
      alterarStatus: vi.fn(),
    } as unknown as Mocked<LocalService>;
    await TestBed.configureTestingModule({
      imports: [LocaisComponent],
      providers: [{ provide: LocalService, useValue: localServiceSpy }, provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(LocaisComponent);
  }

  it('exibe "Aguardando aprovação" para local com StatusExibicao.AprovacaoPendente', async () => {
    await setup();
    localServiceSpy.listLocais.mockReturnValue(of(itens));

    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Aguardando aprovação');
    expect(text).toContain('Ativo');
    expect(text).toContain('Cancelar cadastro');
    expect(text).toContain('Inativar');
  });

  it('busca filtra em memória por código/descrição/cidade (GET real não pagina nem filtra por querystring)', async () => {
    await setup();
    localServiceSpy.listLocais.mockReturnValue(of(itens));
    fixture.detectChanges();

    fixture.componentInstance.buscar('Praça');

    expect(fixture.componentInstance.locais().length).toBe(1);
    expect(fixture.componentInstance.locais()[0].codigo).toBe('LOC-1');
    // Só uma chamada — a busca não refaz o GET, filtra o que já veio.
    expect(localServiceSpy.listLocais).toHaveBeenCalledTimes(1);
  });

  it('em erro de carga, exibe estado de erro genérico sem expor dados parciais', async () => {
    await setup();
    localServiceSpy.listLocais.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );

    fixture.detectChanges();

    expect(fixture.componentInstance.erro()).toBe(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.toLowerCase()).toContain('erro');
  });

  it('exclui um local confirmado e recarrega a listagem', async () => {
    await setup();
    localServiceSpy.listLocais.mockReturnValue(of(itens));
    localServiceSpy.alterarStatus.mockReturnValue(of(void 0));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fixture.detectChanges();

    fixture.componentInstance.excluir(itens[0]);

    expect(localServiceSpy.alterarStatus).toHaveBeenCalledTimes(1);
    expect(localServiceSpy.alterarStatus).toHaveBeenCalledWith(1, 'cancelar', undefined);
    expect(localServiceSpy.listLocais).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.excluindoId()).toBeNull();
  });
});
