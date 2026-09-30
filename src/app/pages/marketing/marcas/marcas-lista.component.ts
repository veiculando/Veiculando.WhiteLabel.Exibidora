import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AurumPageHeaderComponent } from '../../../shared/aurum/aurum-page-header.component';

/**
 * Stub da fundação do TP-4 (card 6fcc4aa2): a rota já existe, com os guards,
 * para o sidebar e o breadcrumb não mudarem quando a tela chegar. O card
 * 5a05f573 (Marcas Parceiras) preenche este componente sem tocar em rotas.
 */
@Component({
  selector: 'app-marcas-lista',
  imports: [AurumPageHeaderComponent],
  template: `<aurum-page-header titulo="Marcas Parceiras" subtitulo="Tela em construção." />`,
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class MarcasListaComponent {}
