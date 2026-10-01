import { Component, ChangeDetectionStrategy } from '@angular/core';

import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AurumBreadcrumbItem, AurumBreadcrumbsComponent } from '../shared/aurum/aurum-breadcrumbs.component';

/**
 * Nome de cada tela na trilha, como no Figma ("Painel > Valores de Peças",
 * "Painel > Operacional — Check out — Detalhe"). A chave é o caminho da rota
 * com parâmetros trocados por `:id`; rota fora do mapa cai no segmento da URL.
 */
const ROTULOS: Record<string, string> = {
  dashboard: 'Dashboard',
  locais: 'Locais',
  'locais/novo': 'Locais — Novo local',
  'locais/:id': 'Locais — Editar local',
  'locais/:id/pecas/nova': 'Locais — Nova peça',
  'locais/:id/pecas/:id': 'Locais — Peça',
  'pecas/valores': 'Valores de peças',
  programacao: 'Operacional — Programação',
  checking: 'Operacional — Checking',
  checkout: 'Operacional — Check out',
  'checkout/:id': 'Operacional — Check out — Detalhe',
  'ordens-servico': 'Operacional — Ordem de serviço',
  'ordens-servico/nova': 'Operacional — Ordem de serviço — Nova ordem',
  'ordens-servico/:id': 'Operacional — Ordem de serviço — Detalhe',
  'pedidos-reserva': 'Solicitações de reserva',
  'pedidos-insercao': 'Pedidos de inserção',
  agencias: 'Agências',
  kyc: 'Análises KYC',
  'kyc/app': 'Cadastros do App',
  'kyc/:id': 'Detalhe da análise KYC',
  campanhas: 'Campanhas',
  prospeccao: 'Prospecção',
  'configuracoes/cadastro-acesso': 'Cadastro e acesso',
  relatorios: 'Relatórios',
  usuarios: 'Usuários',
  // Figma 157:2 e 173:2: lista e formulário trazem a mesma trilha.
  'marketing/banners': 'Marketing — Banners',
  'marketing/banners/novo': 'Marketing — Banners',
  'marketing/banners/:id': 'Marketing — Banners',
  'marketing/marcas': 'Marketing — Marcas Parceiras',
  'marketing/marcas/nova': 'Marketing — Marcas Parceiras',
  'marketing/marcas/:id': 'Marketing — Marcas Parceiras',
  'marketing/depoimentos': 'Marketing — Depoimentos',
  'marketing/depoimentos/novo': 'Marketing — Depoimentos',
  'marketing/depoimentos/:id': 'Marketing — Depoimentos',
};

function rotuloDaUrl(url: string): string {
  const partes = url.split(/[?#]/)[0].split('/').filter(Boolean);
  if (partes.length === 0) return '';
  const chave = partes.map((p, i) => (i > 0 && !['novo', 'nova', 'pecas', 'valores', 'cadastro-acesso', 'app', 'banners', 'marcas', 'depoimentos'].includes(p) ? ':id' : p)).join('/');
  return ROTULOS[chave] ?? partes[partes.length - 1].replace(/-/g, ' ');
}

/** Envelope fino sobre `aurum-breadcrumbs`: deriva a trilha da rota atual. */
@Component({
    selector: 'app-breadcrumb',
    imports: [AurumBreadcrumbsComponent],
    template: `<aurum-breadcrumbs [itens]="itens" />`,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    :host {
      display: block;
      margin-bottom: 20px;
    }
  `]
})
export class BreadcrumbComponent {
  itens: AurumBreadcrumbItem[] = [{ rotulo: 'Painel' }];

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const paginaAtual = rotuloDaUrl(event.urlAfterRedirects);

      this.itens = paginaAtual
        ? [{ rotulo: 'Painel', link: '/dashboard' }, { rotulo: paginaAtual }]
        : [{ rotulo: 'Painel' }];
    });
  }
}
