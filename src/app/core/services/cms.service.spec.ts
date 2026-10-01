import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import {
  cmsBannerSalvoAvisosReal,
  cmsBannersListaReal,
  cmsDepoimentosListaReal,
  cmsDepoimentosResumoReal,
  cmsErroReal,
  cmsMarcaDetalheReal,
} from '../../../testing/contratos/contratos';
import { CmsService, cmsIndisponivel } from './cms.service';

describe('CmsService — contrato api/wl/cms (fixtures reais do BFF)', () => {
  let service: CmsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CmsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista banners com busca, status, page e pageSize na query e lê os campos camelCase', async () => {
    const resposta = firstValueFrom(service.listar('banners', { busca: ' hotsite ', status: 'inativo', page: 2, pageSize: 10 }));
    const req = http.expectOne((r) => r.url === '/api/wl/cms/banners');
    expect(req.request.params.get('busca')).toBe('hotsite');
    expect(req.request.params.get('status')).toBe('inativo');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(cmsBannersListaReal());

    const pagina = await resposta;
    expect(pagina.totalPaginas).toBe(2);
    const [link, html] = pagina.itens;
    expect(link.tipoDestino).toBe('link');
    expect(link.destino != null).toBe(true);
    expect(link.htmlPath != null).toBe(false);
    expect(html.tipoDestino).toBe('html');
    expect(html.htmlPath).toBe('banners/00000000-0000-4000-8000-00000000b102.html');
    expect(html.displayOrder).toBe(12);
    expect(html.ativo).toBe(false);
  });

  it('status "todos" e busca vazia não vão para a query', () => {
    service.listar('marcas', { busca: '  ', status: 'todos' }).subscribe();
    const req = http.expectOne((r) => r.url === '/api/wl/cms/marcas');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ itens: [], page: 1, pageSize: 25, total: 0, totalPaginas: 0 });
  });

  it('depoimentos enviam empresa e desde, e leem company/avatarUrl null como ausentes', async () => {
    const resposta = firstValueFrom(service.listar('depoimentos', { empresa: 'B', desde: '2026-09-01' }));
    const req = http.expectOne((r) => r.url === '/api/wl/cms/depoimentos');
    expect(req.request.params.get('empresa')).toBe('B');
    expect(req.request.params.get('desde')).toBe('2026-09-01');
    req.flush(cmsDepoimentosListaReal());

    const [comEmpresa, semEmpresa] = (await resposta).itens;
    expect(comEmpresa.company != null).toBe(true);
    expect(comEmpresa.avatarUrl != null).toBe(true);
    expect(semEmpresa.company != null).toBe(false);
    expect(semEmpresa.avatarUrl != null).toBe(false);
  });

  it('obter lê a marca pelo id', async () => {
    const resposta = firstValueFrom(service.obter('marcas', '00000000-0000-4000-8000-000000000201'));
    http.expectOne('/api/wl/cms/marcas/00000000-0000-4000-8000-000000000201').flush(cmsMarcaDetalheReal());
    expect((await resposta).name).toBe('Marca Fictícia A');
  });

  it('criar faz POST multipart e devolve { item, avisos }', async () => {
    const dados = new FormData();
    dados.set('title', 'Hotsite Fictício de Teste');
    const resposta = firstValueFrom(service.criar('banners', dados));
    const req = http.expectOne('/api/wl/cms/banners');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(dados);
    req.flush(cmsBannerSalvoAvisosReal(), { status: 201, statusText: 'Created' });

    const salvo = await resposta;
    expect(salvo.item.tipoDestino).toBe('html');
    expect(salvo.avisos).toHaveLength(1);
  });

  it('atualizar faz PUT no id', () => {
    service.atualizar('banners', 'abc', new FormData()).subscribe();
    const req = http.expectOne('/api/wl/cms/banners/abc');
    expect(req.request.method).toBe('PUT');
    req.flush(cmsBannerSalvoAvisosReal());
  });

  it('alterarStatus faz PATCH /status com JSON { ativo }', () => {
    service.alterarStatus('depoimentos', 'x1', true).subscribe();
    const req = http.expectOne('/api/wl/cms/depoimentos/x1/status');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ ativo: true });
    req.flush({ item: cmsDepoimentosListaReal().itens[0], avisos: [] });
  });

  it('resumoDepoimentos lê os cinco números', async () => {
    const resposta = firstValueFrom(service.resumoDepoimentos());
    http.expectOne('/api/wl/cms/depoimentos/resumo').flush(cmsDepoimentosResumoReal());
    expect(await resposta).toEqual({ total: 5, publicados: 3, ocultos: 2, novosNoMes: 1, empresas: 2 });
  });

  it('503 é reconhecido como CMS indisponível; 500 não', async () => {
    const erro503 = firstValueFrom(service.listar('banners')).catch((e) => e);
    http.expectOne((r) => r.url === '/api/wl/cms/banners').flush(cmsErroReal(), { status: 503, statusText: 'Service Unavailable' });
    expect(cmsIndisponivel(await erro503)).toBe(true);
    expect(cmsIndisponivel(new HttpErrorResponse({ status: 500 }))).toBe(false);
  });
});
