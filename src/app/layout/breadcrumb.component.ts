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
  'locais/novo': 'Locais — Novo Local',
  'locais/:id': 'Locais — Editar Local',
  'locais/:id/pecas/nova': 'Locais — Nova Peça',
  'locais/:id/pecas/:id': 'Locais — Peça',
  'pecas/valores': 'Valores de Peças',
  programacao: 'Operacional — Programação',
  checking: 'Operacional — Checking',
  checkout: 'Operacional — Check out',
  'checkout/:id': 'Operacional — Check out — Detalhe',
  'ordens-servico': 'Operacional — Ordem de Serviço',
  'ordens-servico/nova': 'Operacional — Ordem de Serviço — Nova Ordem',
  'ordens-servico/:id': 'Operacional — Ordem de Serviço — Detalhe',
  'pedidos-reserva': 'Solicitações de Reserva',
  'pedidos-insercao': 'Pedidos de Inserção',
  agencias: 'Agências',
  kyc: 'Análises KYC',
  'kyc/app': 'Cadastros do App',
  'kyc/:id': 'Detalhe da Análise KYC',
  campanhas: 'Campanhas',
  prospeccao: 'Prospecção',
  'configuracoes/cadastro-acesso': 'Cadastro e acesso',
  relatorios: 'Relatórios',
  usuarios: 'Usuários',
};

function rotuloDaUrl(url: string): string {
  const partes = url.split(/[?#]/)[0].split('/').filter(Boolean);
  if (partes.length === 0) return '';
  const chave = partes.map((p, i) => (i > 0 && !['novo', 'nova', 'pecas', 'valores', 'cadastro-acesso', 'app'].includes(p) ? ':id' : p)).join('/');
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
