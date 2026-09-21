import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProspeccaoService } from '../../core/services/comercial.service';
import { ProspeccaoSessao } from '../../core/models/comercial.models';
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
      next: (sessao) => this.entregarAoApp(sessao),
      error: (resposta) => {
        this.abrindo = false;
        this.erro = resposta?.error?.message ?? 'Não foi possível iniciar a prospecção.';
      },
    });
  }

  /**
   * Abre o App WL e entrega o token por `postMessage`, nunca pela URL.
   *
   * Token em query string entra no histórico do navegador, no `Referer` da
   * requisição seguinte e no log de qualquer proxy no caminho — o card proíbe os
   * dois. Um POST de formulário também não resolve: o App é uma SPA servida como
   * arquivo estático, e o corpo do POST não chega ao JavaScript dele.
   *
   * O handshake é iniciado pelo App: ele avisa "pronto" quando a página carregou,
   * e só então o token é enviado. Mandar antes seria uma corrida contra o load da
   * outra aba, e a mensagem se perderia em silêncio.
   */
  private entregarAoApp(sessao: ProspeccaoSessao): void {
    const destino = new URL('/prospeccao/entrar', sessao.AppUrl);
    const aba = window.open(destino.toString(), '_blank', 'noopener=no');

    if (!aba) {
      this.abrindo = false;
      this.erro = 'Permita janelas pop-up para abrir a prospecção.';
      return;
    }

    const origemApp = destino.origin;

    const aoReceber = (evento: MessageEvent) => {
      // Origem verificada antes de o conteúdo ser lido.
      if (evento.origin !== origemApp) return;
      if (evento.data?.type !== 'prospeccao-pronto') return;

      window.removeEventListener('message', aoReceber);
      clearTimeout(expiracao);
      this.abrindo = false;

      // Destino explícito, nunca '*': com curinga, qualquer página que tivesse
      // conseguido se colocar nessa janela receberia o token.
      aba.postMessage(
        {
          type: 'prospeccao-token',
          token: sessao.Token,
          operadorId: sessao.FonteUsuarioId,
          anuncianteId: null,
        },
        origemApp
      );
    };

    const expiracao = setTimeout(() => {
      window.removeEventListener('message', aoReceber);
      this.abrindo = false;
      this.erro = 'O aplicativo não respondeu. Tente iniciar a prospecção de novo.';
    }, 15000);

    window.addEventListener('message', aoReceber);
  }
}
