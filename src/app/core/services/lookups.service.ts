import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CidadeLookup, MapaConfig, NomeadoLookup, Periodicidade, PeriodoLookup } from '../models/wl.models';

@Injectable({ providedIn: 'root' })
export class LookupsService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/lookups`;

  /**
   * Lookups sao estaveis dentro de uma sessao, entao cada um e cacheado com
   * `shareReplay(1)` — a grade de programacao e a tela de locais consultam os
   * mesmos periodos e cidades.
   */
  private cache = new Map<string, Observable<unknown>>();

  private get<T>(caminho: string, chaveCache: string = caminho, params?: HttpParams): Observable<T> {
    if (!this.cache.has(chaveCache)) {
      const requisicao = this.http.get<T>(`${this.base}/${caminho}`, { params }).pipe(
        // `shareReplay` reemite tambem o ERRO para todo assinante futuro. Sem
        // descartar a entrada aqui, uma falha de rede na primeira chamada ficava
        // cacheada pelo resto da sessao: o dropdown de cidades do cadastro de
        // local (que engole o erro com `error: () => this.cidades = []`) ficava
        // permanentemente vazio e nenhuma tentativa posterior refazia a
        // requisicao — so recarregando a pagina.
        catchError((erro: unknown) => {
          this.cache.delete(chaveCache);
          return throwError(() => erro);
        }),
        shareReplay(1)
      );

      this.cache.set(chaveCache, requisicao);
    }
    return this.cache.get(chaveCache) as Observable<T>;
  }

  cidades(): Observable<CidadeLookup[]> {
    return this.get<CidadeLookup[]>('cidades');
  }

  /**
   * `GET /api/wl/lookups/periodos` — sem `periodicidade`, devolve todos os
   * períodos ativos (comportamento antigo, preservado). Com `periodicidade`,
   * filtra no servidor (`LookupsController.GetPeriodos`) — é o que VEI-RD-86
   * usa para recarregar Período Inicial/Final quando a Periodicidade muda.
   * Cada periodicidade tem seu próprio balde de cache: sem isso, trocar de
   * Bissemana para Mensal serviria a lista de bi-semanas do cache errado.
   */
  periodos(periodicidade?: Periodicidade | null): Observable<PeriodoLookup[]> {
    if (periodicidade == null) {
      return this.get<PeriodoLookup[]>('periodos');
    }
    const params = new HttpParams().set('periodicidade', periodicidade);
    return this.get<PeriodoLookup[]>('periodos', `periodos:${periodicidade}`, params);
  }

  suportes(): Observable<NomeadoLookup[]> {
    return this.get<NomeadoLookup[]>('suportes');
  }

  segmentos(): Observable<NomeadoLookup[]> {
    return this.get<NomeadoLookup[]>('segmentos');
  }

  pois(): Observable<NomeadoLookup[]> {
    return this.get<NomeadoLookup[]>('pois');
  }

  /** `GET /api/wl/lookups/mapa-config` (VEI-RD-87) — chave do Google Maps, autenticada. */
  mapaConfig(): Observable<MapaConfig> {
    return this.get<MapaConfig>('mapa-config');
  }
}
