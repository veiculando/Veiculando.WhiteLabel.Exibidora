import { TestBed } from '@angular/core/testing';
import { SnapsSupportLoader } from './snaps-support-loader';

describe('SnapsSupportLoader', () => {
  it('pede o asset versionado uma única vez com SRI e rejeita erro do navegador', async () => {
    const loader = TestBed.inject(SnapsSupportLoader);
    const carregamento = loader.carregar();
    expect(loader.carregar()).toBe(carregamento);

    const scripts = document.head.querySelectorAll<HTMLScriptElement>(
      'script[src="/assets/snaps/snaps-client.umd.js?v=0.3.0"]',
    );
    expect(scripts.length).toBe(1);
    const script = scripts[0];
    try {
      expect(script.integrity).toBe('sha256-GWqyCyR7kulx2ppekrQx0pQQ/BFqzF+VoKOoCn6Iy5I=');
      script.dispatchEvent(new Event('error'));
      await expect(carregamento).rejects.toThrow('Falha ao carregar o UMD');
    } finally {
      script.remove();
    }
  });
});
