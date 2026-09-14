import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CidadeLookup, NomeadoLookup, PeriodoLookup } from '../models/wl.models';

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

  private get<T>(caminho: string): Observable<T> {
    if (!this.cache.has(caminho)) {
      const requisicao = this.http.get<T>(`${this.base}/${caminho}`).pipe(
        // `shareReplay` reemite tambem o ERRO para todo assinante futuro. Sem
        // descartar a entrada aqui, uma falha de rede na primeira chamada ficava
        // cacheada pelo resto da sessao: o dropdown de cidades do cadastro de
        // local (que engole o erro com `error: () => this.cidades = []`) ficava
        // permanentemente vazio e nenhuma tentativa posterior refazia a
        // requisicao — so recarregando a pagina.
        catchError((erro: unknown) => {
          this.cache.delete(caminho);
          return throwError(() => erro);
        }),
        shareReplay(1)
      );

      this.cache.set(caminho, requisicao);
    }
    return this.cache.get(caminho) as Observable<T>;
  }

  cidades(): Observable<CidadeLookup[]> {
    return this.get<CidadeLookup[]>('cidades');
  }

  periodos(): Observable<PeriodoLookup[]> {
    return this.get<PeriodoLookup[]>('periodos');
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
}
