import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AurumPageHeaderComponent } from '../../../shared/aurum/aurum-page-header.component';

/**
 * Stub da fundação do TP-4 (card 6fcc4aa2): a rota já existe, com os guards,
 * para o sidebar e o breadcrumb não mudarem quando a tela chegar. O card
 * 3867cce1 (Depoimentos) preenche este componente sem tocar em rotas.
 */
@Component({
  selector: 'app-depoimentos-form',
  imports: [AurumPageHeaderComponent],
  template: `<aurum-page-header titulo="Novo Depoimento" subtitulo="Tela em construção." />`,
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class DepoimentosFormComponent {}
