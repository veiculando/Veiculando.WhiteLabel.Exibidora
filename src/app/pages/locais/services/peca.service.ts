import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { PecaApiDetalhe, PecaCadastroComando, PecaDetalhe, PecaListItem, PecaPayload } from '../models/peca.model';

/**
 * Consome o CRUD de Peça do BFF WhiteLabel real (sprint-9.0): GET/POST/PUT
 * /api/wl/pecas. Não existe rota escopada por local nem paginação — GET
 * devolve todas as peças da afiliada, e `listPecasByLocal` filtra em
 * memória (ver PecasController real, que não tem `GET locais/{id}/pecas`).
 *
 * `idLocal` sempre chega como parâmetro explícito (nunca lido do próprio
 * payload do formulário) — a rota é a única fonte do local pai.
 */
@Injectable({ providedIn: 'root' })
export class PecaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.bffUrl}/pecas`;

  listPecas(): Observable<PecaListItem[]> {
    return this.http.get<PecaListItem[]>(this.baseUrl);
  }

  listPecasByLocal(idLocal: number): Observable<PecaListItem[]> {
    return this.listPecas().pipe(map((itens) => itens.filter((p) => p.idLocal === idLocal)));
  }

  getPeca(id: number): Observable<PecaDetalhe> {
    return this.http.get<PecaApiDetalhe>(`${this.baseUrl}/${id}`).pipe(map(paraDetalheFlat));
  }

  createPeca(payload: PecaPayload): Observable<void> {
    return this.http.post(this.baseUrl, paraComando(payload)).pipe(map(() => undefined));
  }

  updatePeca(id: number, payload: PecaPayload): Observable<void> {
    return this.http.put(`${this.baseUrl}/${id}`, paraComando(payload)).pipe(map(() => undefined));
  }
}

/** Traduz o payload flat do formulário para PecaCadastroCommand (Core). */
function paraComando(payload: PecaPayload): PecaCadastroComando {
  return {
    idLocal: payload.idLocal,
    idTipoSuporte: payload.idTipoSuporte,
    codigoInterno: payload.codigoInterno,
    periodicidadePadrao: payload.periodicidadePadrao,
    valorPadrao: payload.valorPadrao,
    idFormato: payload.idFormato,
    formato: {
      largura: payload.formatoLargura,
      altura: payload.formatoAltura,
      juncao: payload.formatoJuncao,
    },
    especificacaoProducao: {
      largura: payload.especificacaoLargura,
      altura: payload.especificacaoAltura,
      material: payload.especificacaoMaterial,
      especificacao: payload.especificacaoTexto,
    },
    idsSubstratoTipo: payload.idsSubstratoTipo,
    iluminacao: payload.iluminacao,
    semaforo: payload.semaforo,
    anguloDeVisao: payload.anguloDeVisao,
    via: {
      viaTipo: payload.viaTipo,
      faixas: payload.viaFaixas,
      velociade: payload.viaVelocidade,
      pedestre: payload.viaPedestre,
    },
    roteiroComercial: payload.roteiroComercial,
    alvara: payload.alvara,
    streetView: { url: payload.streetView ?? '' },
    descricao: payload.descricao,
    restricao: payload.restricao,
  };
}

/** Traduz PecaApiDetalhe (aninhado) para o shape flat que o formulário usa. */
function paraDetalheFlat(peca: PecaApiDetalhe): PecaDetalhe {
  return {
    id: peca.id,
    codigo: peca.codigo,
    statusExibicao: peca.statusExibicao,
    fotoUrl: null, // upload de foto ainda não persiste no servidor (T6/TP-2)

    idLocal: peca.idLocal,
    idTipoSuporte: peca.idTipoSuporte,
    codigoInterno: peca.codigoInterno,
    periodicidadePadrao: peca.periodicidadePadrao,
    valorPadrao: peca.valorPadrao,

    idFormato: peca.idFormato ?? 0,
    formatoLargura: peca.formato?.largura ?? 0,
    formatoAltura: peca.formato?.altura ?? 0,
    formatoJuncao: peca.formato?.juncao ?? 0,

    especificacaoLargura: peca.especificacaoProducao?.largura ?? null,
    especificacaoAltura: peca.especificacaoProducao?.altura ?? null,
    especificacaoMaterial: peca.especificacaoProducao?.material ?? null,
    especificacaoTexto: peca.especificacaoProducao?.especificacao ?? null,

    idsSubstratoTipo: [],

    iluminacao: peca.iluminacao,
    semaforo: peca.semaforo,
    anguloDeVisao: peca.anguloDeVisao,

    viaTipo: peca.via?.viaTipo ?? 0,
    viaFaixas: peca.via?.faixas ?? 0,
    viaVelocidade: peca.via?.velociade ?? 0,
    viaPedestre: peca.via?.pedestre ?? 0,

    roteiroComercial: peca.roteiroComercial,
    alvara: peca.alvara,
    streetView: peca.streetView,
    descricao: peca.descricao,
    restricao: peca.restricao,
  };
}
