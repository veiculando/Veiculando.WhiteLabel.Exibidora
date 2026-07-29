import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
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
      this.cache.set(caminho, this.http.get<T>(`${this.base}/${caminho}`).pipe(shareReplay(1)));
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
