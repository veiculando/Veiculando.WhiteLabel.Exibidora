import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Raiz da aplicacao. Deliberadamente vazia: toda a moldura visual vive no
 * `ShellComponent`, aplicado apenas as rotas autenticadas.
 *
 * A versao anterior continha o smoke test da Sprint 8 (grid do ag-grid com dados
 * fixos e um botao "Testar Secure Storage") renderizado ACIMA do `router-outlet`,
 * ou seja, em todas as telas, inclusive na de login. Removido aqui.
 */
@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: '<router-outlet />'
})
export class AppComponent {}
