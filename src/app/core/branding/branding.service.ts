import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BrandingPublico {
  nomeExibicao: string;
  logoUrl: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  footerText?: string;
  seoTitle?: string;
  seoDescription?: string;
  /**
   * Módulo CMS ligado nesta instância (ADR-CMS-004). Ausente = `false`: o BFF só
   * passa a enviar o campo no TP-3, e até lá nenhuma exibidora vê Marketing.
   */
  cmsHabilitado?: boolean;
  /**
   * Site institucional que lê o CMS, sem barra final (o BFF normaliza). Monta o
   * link "Abrir hotsite" (`{cmsSiteUrl}/ofertas/{id}`). `null` com o módulo
   * desligado ou sem `Cms:SiteUrl` válido — nenhum domínio fica fixo no front.
   */
  cmsSiteUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly state = signal<BrandingPublico | null>(null);

  readonly branding = this.state.asReadonly();

  async load(): Promise<void> {
    try {
      const payload = await firstValueFrom(
        this.http.get<unknown>(`${environment.bffUrl}/config/branding`)
      );
      const branding = this.validate(payload);
      this.apply(branding);
      this.state.set(branding);
    } catch (error) {
      this.clearAppliedBranding();
      this.state.set(null);
      throw error;
    }
  }

  private validate(payload: unknown): BrandingPublico {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Branding obrigatório não configurado.');
    }

    const value = payload as Record<string, unknown>;
    const nomeExibicao = this.required(value, 'nomeExibicao');
    const logoUrl = this.required(value, 'logoUrl');
    const primaryColor = this.required(value, 'primaryColor');

    return {
      nomeExibicao,
      logoUrl,
      primaryColor,
      secondaryColor: this.optional(value, 'secondaryColor') ?? '#333333',
      accentColor: this.optional(value, 'accentColor') ?? primaryColor,
      faviconUrl: this.safeFavicon(this.optional(value, 'faviconUrl')),
      footerText: this.optional(value, 'footerText'),
      seoTitle: this.optional(value, 'seoTitle'),
      seoDescription: this.optional(value, 'seoDescription'),
      // Só o booleano true liga: "true", 1 ou ausente mantêm o módulo desligado.
      cmsHabilitado: value['cmsHabilitado'] === true,
      cmsSiteUrl: this.siteHttps(this.optional(value, 'cmsSiteUrl')),
    };
  }

  /** Só https absoluta vira link; o resto (ausente, http, relativa) é `null`. */
  private siteHttps(value: string | undefined): string | null {
    if (!value || !/^https:\/\/[^/\s]/i.test(value)) return null;
    return value.replace(/\/+$/, '');
  }

  private required(value: Record<string, unknown>, field: string): string {
    const result = this.optional(value, field);
    if (!result) {
      throw new Error(`Campo obrigatório de branding ausente: ${field}.`);
    }
    return result;
  }

  private optional(value: Record<string, unknown>, field: string): string | undefined {
    const result = value[field];
    return typeof result === 'string' && result.trim() ? result.trim() : undefined;
  }

  private apply(branding: BrandingPublico): void {
    const root = this.document.documentElement.style;
    root.setProperty('--primary-color', branding.primaryColor);
    root.setProperty('--secondary-color', branding.secondaryColor);
    root.setProperty('--accent-color', branding.accentColor);
    root.setProperty('--primary-light', branding.accentColor);
    root.setProperty('--gold-accent', branding.secondaryColor);

    this.title.setTitle(branding.seoTitle ?? branding.nomeExibicao);
    if (branding.seoDescription) {
      this.meta.updateTag({ name: 'description', content: branding.seoDescription });
    } else {
      this.meta.removeTag('name="description"');
    }

    const favicon = this.ensureFavicon();
    favicon.onerror = () => {
      favicon.onerror = null;
      favicon.setAttribute('href', '/favicon-neutral.svg');
    };
    favicon.setAttribute('href', branding.faviconUrl ?? '/favicon-neutral.svg');
  }

  private clearAppliedBranding(): void {
    const root = this.document.documentElement.style;
    [
      '--primary-color',
      '--secondary-color',
      '--accent-color',
      '--primary-light',
      '--gold-accent',
    ].forEach((property) => root.removeProperty(property));

    this.title.setTitle('Configuração indisponível');
    this.meta.removeTag('name="description"');
    const favicon = this.ensureFavicon();
    favicon.onerror = null;
    favicon.setAttribute('href', '/favicon-neutral.svg');
  }

  private safeFavicon(value: string | undefined): string | undefined {
    if (!value || !(value.startsWith('/') || /^https:\/\//i.test(value)) || value.startsWith('//')) {
      return undefined;
    }
    try {
      const url = new URL(value, this.document.baseURI);
      if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)) return undefined;
      return value;
    } catch {
      return undefined;
    }
  }

  private ensureFavicon(): HTMLLinkElement {
    const icons = Array.from(this.document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
    const favicon = icons.shift() ?? this.document.createElement('link');
    icons.forEach(icon => icon.remove());
    favicon.setAttribute('rel', 'icon');
    favicon.removeAttribute('type');
    favicon.removeAttribute('sizes');
    if (!favicon.isConnected) this.document.head.appendChild(favicon);
    return favicon;
  }
}
