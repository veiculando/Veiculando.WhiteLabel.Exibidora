import { Component, ChangeDetectionStrategy } from '@angular/core';

import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AurumBreadcrumbItem, AurumBreadcrumbsComponent } from '../shared/aurum/aurum-breadcrumbs.component';

/** Envelope fino sobre `aurum-breadcrumbs`: deriva a trilha da rota atual. */
@Component({
    selector: 'app-breadcrumb',
    imports: [AurumBreadcrumbsComponent],
    template: `<aurum-breadcrumbs [itens]="itens" />`,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    :host {
      display: block;
      margin-bottom: 18px;
    }
  `]
})
export class BreadcrumbComponent {
  itens: AurumBreadcrumbItem[] = [{ rotulo: 'Painel' }];

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const parts = event.urlAfterRedirects.split('/').filter(Boolean);
      const paginaAtual = parts.length > 0 ? parts[parts.length - 1].replace(/-/g, ' ') : '';

      this.itens = paginaAtual
        ? [{ rotulo: 'Painel', link: '/dashboard' }, { rotulo: paginaAtual }]
        : [{ rotulo: 'Painel' }];
    });
  }
}
