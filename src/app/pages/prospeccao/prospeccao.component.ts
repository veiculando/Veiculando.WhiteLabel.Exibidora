import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProspeccaoService } from '../../core/services/comercial.service';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumCardComponent } from '../../shared/aurum/aurum-card.component';
import { AurumEyebrowComponent } from '../../shared/aurum/aurum-eyebrow.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';

/**
 * Prospecção — VEI-RD-83, frame `154:5565`.
 *
 * **A copy da tela é a do Figma, não a do protótipo.** O protótipo expunha
 * `FonteAgenciaId`, "BFF" e "TTL" na interface; o Figma trocou tudo por linguagem de
 * usuário — "FonteAgenciaId" virou "Identificação", e "Session token com TTL curto
 * emitido pelo BFF" virou "Entra automaticamente, sem senha." O comportamento técnico
 * é exatamente o mesmo; ele só não aparece na tela. O critério de aceite testa a
 * AUSÊNCIA dessas palavras na interface.
 */
@Component({
  selector: 'app-prospeccao',
  imports: [
    AurumPageHeaderComponent,
    AurumButtonComponent,
    AurumCardComponent,
    AurumEyebrowComponent,
  ],
  templateUrl: './prospeccao.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .prospeccao__grade { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; align-items: start; }
      .prospeccao__destaque { background: var(--drawer-bg); color: var(--white); border-radius: var(--radius-md); padding: 24px; }
      .prospeccao__destaque h2 { margin: 8px 0 12px; }
      .prospeccao__item { margin-bottom: 16px; }
      .prospeccao__item strong { display: block; margin-bottom: 2px; }
      .prospeccao__item span { color: var(--on-surface); font-size: 0.9rem; }
      .prospeccao__erro { color: var(--erro, #b00020); margin-top: 12px; }
    `,
  ],
})
export class ProspeccaoComponent {
  private serv = inject(ProspeccaoService);

  abrindo = false;
  erro = '';

  /** Copy literal do Figma — nada de jargão técnico na interface. */
  readonly comoFunciona = [
    { titulo: 'Token temporário', texto: 'Entra automaticamente, sem senha.' },
    { titulo: 'Identificação', texto: 'Vinculado ao operador para rastrear a origem do pedido.' },
    { titulo: 'Expira automaticamente', texto: 'O acesso encerra depois de um tempo.' },
  ];

  iniciar(): void {
    this.abrindo = true;
    this.erro = '';

    this.serv.abrirSessao().subscribe({
      next: (sessao) => {
        this.abrindo = false;
        // O token viaja no corpo da resposta e é entregue ao App por POST, nunca na
        // query string: token em URL entra no histórico do navegador, no Referer da
        // requisição seguinte e no log de qualquer proxy no caminho.
        this.abrirAppComToken(sessao.AppUrl, sessao.Token);
      },
      error: (resposta) => {
        this.abrindo = false;
        this.erro = resposta?.error?.message ?? 'Não foi possível iniciar a prospecção.';
      },
    });
  }

  /**
   * Abre o App WL em nova aba entregando o token por um POST auto-submetido, e não
   * por `window.open(url + '?token=')`.
   */
  private abrirAppComToken(appUrl: string, token: string): void {
    const aba = window.open('', '_blank', 'noopener');
    if (!aba) {
      this.erro = 'Permita janelas pop-up para abrir a prospecção.';
      return;
    }

    const form = aba.document.createElement('form');
    form.method = 'POST';
    form.action = appUrl;

    const campo = aba.document.createElement('input');
    campo.type = 'hidden';
    campo.name = 'token';
    campo.value = token;

    form.appendChild(campo);
    aba.document.body.appendChild(form);
    form.submit();
  }
}
