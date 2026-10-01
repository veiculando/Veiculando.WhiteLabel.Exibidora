import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CmsDepoimentosResumo,
  CmsFiltro,
  CmsItens,
  CmsRecurso,
  CmsSalvo,
  Pagina,
} from '../models/cms.models';

/**
 * Cliente de `api/wl/cms/{banners|marcas|depoimentos}` (contrato de escrita no
 * walkthrough f7af7a15 do TP-3).
 *
 * Escrita em multipart: quem chama monta o `FormData` com os campos camelCase
 * do BFF. Não existe DELETE — o registro sai do site com o PATCH `/status`.
 *
 * ⚠️ O preview escreve no Supabase de PRODUÇÃO (ADR-CMS-004): QA manual só com
 * dado fictício e inativo.
 */
@Injectable({ providedIn: 'root' })
export class CmsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/cms`;

  listar<R extends CmsRecurso>(recurso: R, filtro: CmsFiltro = {}): Observable<Pagina<CmsItens[R]>> {
    return this.http.get<Pagina<CmsItens[R]>>(`${this.base}/${recurso}`, { params: this.params(filtro) });
  }

  obter<R extends CmsRecurso>(recurso: R, id: string): Observable<CmsItens[R]> {
    return this.http.get<CmsItens[R]>(`${this.base}/${recurso}/${encodeURIComponent(id)}`);
  }

  /** POST responde 201. Sem `ativo`, o BFF cria inativo; sem `displayOrder`, põe no fim da fila. */
  criar<R extends CmsRecurso>(recurso: R, dados: FormData): Observable<CmsSalvo<CmsItens[R]>> {
    return this.http.post<CmsSalvo<CmsItens[R]>>(`${this.base}/${recurso}`, dados);
  }

  /** PUT: campo ausente mantém o valor atual (status, ordem, arquivo). */
  atualizar<R extends CmsRecurso>(recurso: R, id: string, dados: FormData): Observable<CmsSalvo<CmsItens[R]>> {
    return this.http.put<CmsSalvo<CmsItens[R]>>(`${this.base}/${recurso}/${encodeURIComponent(id)}`, dados);
  }

  alterarStatus<R extends CmsRecurso>(recurso: R, id: string, ativo: boolean): Observable<CmsSalvo<CmsItens[R]>> {
    return this.http.patch<CmsSalvo<CmsItens[R]>>(`${this.base}/${recurso}/${encodeURIComponent(id)}/status`, { ativo });
  }

  resumoDepoimentos(): Observable<CmsDepoimentosResumo> {
    return this.http.get<CmsDepoimentosResumo>(`${this.base}/depoimentos/resumo`);
  }

  private params(filtro: CmsFiltro): HttpParams {
    let params = new HttpParams();
    const busca = filtro.busca?.trim();
    const empresa = filtro.empresa?.trim();
    if (busca) params = params.set('busca', busca);
    if (filtro.status && filtro.status !== 'todos') params = params.set('status', filtro.status);
    if (empresa) params = params.set('empresa', empresa);
    if (filtro.desde) params = params.set('desde', filtro.desde);
    if (filtro.page != null) params = params.set('page', filtro.page);
    if (filtro.pageSize != null) params = params.set('pageSize', filtro.pageSize);
    return params;
  }
}

/**
 * 503 do módulo: o Supabase está fora. A tela troca o erro genérico por
 * "CMS indisponível" — o operador não tem o que corrigir, só esperar.
 */
export function cmsIndisponivel(erro: unknown): boolean {
  return erro instanceof HttpErrorResponse && erro.status === 503;
}
