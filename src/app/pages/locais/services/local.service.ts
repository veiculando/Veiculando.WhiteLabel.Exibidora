import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  LocalCadastroComando,
  LocalCadastroResponse,
  LocalCadastroResumo,
  LocalDadosPayload,
  LocalDetalhe,
  LocalListItem,
} from '../models/local.model';

/**
 * Consome o CRUD de Local do BFF WhiteLabel real (sprint-9.0):
 * GET/POST/PUT/DELETE /api/wl/locais.
 *
 * Nunca envia AfiliadaId/tenant: o BFF resolve o tenant pelo Host
 * (ADR-WL-008) e o Core decide AprovacaoPendente vs Ativo pelo tipo da
 * conta de serviço (ADR-WL-004). GET não pagina nem filtra — devolve
 * todos os locais da afiliada.
 */
@Injectable({ providedIn: 'root' })
export class LocalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.bffUrl}/locais`;

  listLocais(): Observable<LocalListItem[]> {
    return this.http.get<LocalListItem[]>(this.baseUrl);
  }

  getLocal(id: number): Observable<LocalDetalhe> {
    return this.http.get<LocalDetalhe>(`${this.baseUrl}/${id}`);
  }

  createLocal(payload: LocalDadosPayload): Observable<LocalCadastroResumo | null> {
    return this.http
      .post<LocalCadastroResponse>(this.baseUrl, this.paraComando(payload))
      .pipe(map(resposta => resposta.data?.local ?? null));
  }

  updateLocal(id: number, payload: LocalDadosPayload): Observable<LocalCadastroResumo | null> {
    return this.http
      .put<LocalCadastroResponse>(`${this.baseUrl}/${id}`, this.paraComando(payload))
      .pipe(map(resposta => resposta.data?.local ?? null));
  }

  deleteLocal(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  alterarStatus(id: number, acao: 'cancelar' | 'inativar' | 'reativar', timeStamp?: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${id}/${acao}`, { timeStamp });
  }

  /** Traduz o payload flat do formulário para LocalCadastroCommand (Core). */
  private paraComando(payload: LocalDadosPayload): LocalCadastroComando {
    return {
      idCidade: payload.idCidade,
      codigoInterno: payload.codigoInterno,
      descricao: payload.descricao,
      palavrasChave: payload.palavrasChave,
      endereco: {
        bairro: payload.bairro,
        logradouro: payload.logradouro,
        numero: payload.numero,
        complemento: payload.complemento,
        referencia: payload.referencia,
        cep: { numero: payload.cep },
      },
      geolocalizacao: {
        latitude: payload.latitude,
        longitude: payload.longitude,
      },
    };
  }
}
