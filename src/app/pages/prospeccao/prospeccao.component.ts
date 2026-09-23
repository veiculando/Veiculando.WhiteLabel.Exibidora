import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProspeccaoService } from '../../core/services/comercial.service';
import { ProspeccaoSessao } from '../../core/models/comercial.models';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumCardComponent } from '../../shared/aurum/aurum-card.component';
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
  ],
  templateUrl: './prospeccao.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .prospeccao__grade { display: grid; grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr); gap: 20px; align-items: start; }
      @media (max-width: 900px) { .prospeccao__grade { grid-template-columns: 1fr; } }
      .prospeccao__destaque { padding: 28px 24px; border-radius: 18px; background: var(--sidebar-bg); color: var(--paper-bg); box-shadow: var(--shadow-card); }
      .prospeccao__eyebrow { display: inline-flex; align-items: center; gap: 10px; font-size: 0.6875rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--secondary-color); }
      .prospeccao__eyebrow::before { content: ''; width: 36px; height: 2px; background: var(--secondary-color); }
      .prospeccao__destaque h2 { margin: 14px 0 12px; font-size: 1.25rem; color: var(--paper-bg); }
      .prospeccao__destaque p { max-width: 520px; margin: 0 0 24px; font-size: 0.84375rem; line-height: 1.7; color: color-mix(in srgb, var(--paper-bg) 88%, transparent); }
      .prospeccao__ico { width: 14px; height: 14px; }
      .prospeccao__como h2 { margin: 0 0 18px; font-size: 1.0625rem; }
      .prospeccao__item { display: flex; gap: 12px; margin-bottom: 16px; }
      .prospeccao__item:last-child { margin-bottom: 0; }
      .prospeccao__item-icone { display: grid; place-items: center; flex: none; width: 32px; height: 32px; border: 1px solid var(--line-search); border-radius: 8px; background: color-mix(in srgb, var(--primary-color) 4%, var(--white)); color: var(--primary-color); }
      .prospeccao__item-icone .aurum-ico { width: 15px; height: 15px; }
      .prospeccao__item strong { display: block; font-size: 0.8125rem; color: var(--charcoal); }
      .prospeccao__item span span { font-size: 0.75rem; color: var(--on-surface); }
      .prospeccao__erro { margin: 12px 0 0; color: var(--gold-light); }
    `,
  ],
})
export class ProspeccaoComponent {
  private serv = inject(ProspeccaoService);

  abrindo = false;
  erro = '';

  /** Copy literal do Figma — nada de jargão técnico na interface. */
  readonly comoFunciona = [
    { titulo: 'Token temporário', texto: 'Entra automaticamente, sem senha.', icone: 'chave' },
    { titulo: 'Identificação', texto: 'Vinculado ao operador para rastrear a origem do pedido.', icone: 'escudo' },
    { titulo: 'Expira automaticamente', texto: 'O acesso encerra depois de um tempo.', icone: 'relogio' },
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
