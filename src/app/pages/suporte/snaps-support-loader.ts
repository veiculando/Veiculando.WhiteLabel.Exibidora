import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import pin from './snaps-client.json';

@Injectable({ providedIn: 'root' })
export class SnapsSupportLoader {
  private readonly document = inject(DOCUMENT);
  private carregamento?: Promise<void>;

  carregar(): Promise<void> {
    return this.carregamento ??= new Promise<void>((resolve, reject) => {
      const registry = this.document.defaultView?.customElements;
      const tag = 'snaps-support-board';
      if (!registry || registry.get(tag)) {
        reject(new Error('Registro do componente de suporte indisponível.'));
        return;
      }

      const script = this.document.createElement('script');
      // O nginx publica assets com cache imutável. Uma versão nova usa outra URL.
      script.src = `/assets/snaps/snaps-client.umd.js?v=${pin.version}`;
      script.integrity = pin.integrity;
      script.addEventListener('load', () => {
        if (registry.get(tag)) resolve();
        else reject(new Error('O UMD não registrou o componente de suporte.'));
      }, { once: true });
      script.addEventListener('error', () => {
        reject(new Error('Falha ao carregar o UMD de suporte.'));
      }, { once: true });
      this.document.head.append(script);
    });
  }
}
