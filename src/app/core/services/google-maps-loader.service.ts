import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LookupsService } from './lookups.service';

/**
 * Carrega o script do Google Maps JS sob demanda (VEI-RD-87).
 *
 * A chave vem do BFF (`GET /api/wl/lookups/mapa-config`), nunca hardcoded no
 * bundle — ver o comentário em `LookupsController.GetMapaConfig` sobre por
 * que ainda é uma chave única da plataforma, não por afiliada.
 *
 * Nunca lança: sem chave configurada, ou se o carregamento falhar, resolve
 * `false` — o wizard de Local cai para entrada manual de coordenadas, a
 * mesma regra que já vale para falha de CEP/geocoding (nunca bloquear o
 * formulário).
 */
@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private readonly document = inject(DOCUMENT);
  private readonly lookups = inject(LookupsService);

  private carregamento: Promise<boolean> | null = null;

  carregar(): Promise<boolean> {
    if (!this.carregamento) {
      this.carregamento = this.carregarInterno();
    }
    return this.carregamento;
  }

  private async carregarInterno(): Promise<boolean> {
    if (this.temGoogleMaps()) return true;

    try {
      const config = await firstValueFrom(this.lookups.mapaConfig());
      if (!config.googleMapsApiKey) return false;

      await this.injetarScript(config.googleMapsApiKey);
      return this.temGoogleMaps();
    } catch {
      return false;
    }
  }

  private temGoogleMaps(): boolean {
    return !!(this.document.defaultView as unknown as { google?: { maps?: unknown } })?.google?.maps;
  }

  private injetarScript(chave: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(chave)}`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Falha ao carregar o Google Maps.'));
      this.document.head.appendChild(script);
    });
  }
}
