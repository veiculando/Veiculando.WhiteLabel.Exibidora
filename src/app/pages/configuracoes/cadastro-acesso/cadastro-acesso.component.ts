import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CadastroAcessoService } from '../../../core/services/comercial.service';
import { CadastroAcessoConfig } from '../../../core/models/comercial.models';
import { AurumButtonComponent } from '../../../shared/aurum/aurum-button.component';
import {
  AurumHistoryCardComponent,
  AurumHistoryEvento,
} from '../../../shared/aurum/aurum-history-card.component';
import { AurumPageHeaderComponent } from '../../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent } from '../../../shared/aurum/aurum-status-pill.component';

/**
 * Configurações → Cadastro e acesso — VEI-RD-82, frame `287:12843`.
 *
 * **Alternar o switch não aplica nada.** A mudança só existe depois de "Salvar
 * alterações": recarregar a página sem salvar volta ao estado anterior e nenhuma
 * linha de histórico é gravada. Uma política de acesso que mudasse ao toque, sem
 * confirmação, transformaria um clique acidental numa mudança de quem consegue se
 * cadastrar — e o histórico registraria o acidente como decisão.
 *
 * **A lista de domínios é do backend.** O frontend só a exibe; não há controle de
 * edição no DOM nesta versão, e não é um controle desabilitado — é ausência.
 */
@Component({
  selector: 'app-cadastro-acesso',
  imports: [
    FormsModule,
    AurumPageHeaderComponent,
    AurumButtonComponent,
    AurumHistoryCardComponent,
    AurumStatusPillComponent,
  ],
  templateUrl: './cadastro-acesso.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .cadastro-acesso__grade { display: grid; grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr); gap: 20px; align-items: start; }
      @media (max-width: 900px) { .cadastro-acesso__grade { grid-template-columns: 1fr; } }
      .cadastro-acesso__cartao { background: var(--white); border: 1px solid var(--line-subtle); border-radius: 18px; box-shadow: var(--shadow-card); }
      .cadastro-acesso__topo { display: flex; align-items: flex-start; gap: 14px; padding: 20px 24px; border-bottom: 1px solid var(--line-search); }
      .cadastro-acesso__selo { display: grid; place-items: center; flex: none; width: 40px; height: 40px; border-radius: 10px; background: var(--wine-grad); color: var(--gold-light); }
      .cadastro-acesso__titulo { flex: 1; }
      .cadastro-acesso__linha { display: flex; align-items: center; gap: 10px; }
      .cadastro-acesso__linha h2 { margin: 0; font-size: 1.0625rem; font-weight: 700; }
      .cadastro-acesso__descricao { margin: 6px 0 0; font-size: 0.78125rem; color: var(--on-surface); }
      .cadastro-acesso__switch { position: relative; flex: none; width: 40px; height: 22px; cursor: pointer; }
      .cadastro-acesso__switch input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
      .cadastro-acesso__switch span { position: absolute; inset: 0; border-radius: 999px; background: rgba(0, 0, 0, 0.18); transition: background 160ms ease; }
      .cadastro-acesso__switch span::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: var(--white); transition: transform 160ms ease; }
      .cadastro-acesso__switch input:checked + span { background: var(--primary-color); }
      .cadastro-acesso__switch input:checked + span::after { transform: translateX(18px); }
      .cadastro-acesso__switch input:focus-visible + span { outline: 3px solid color-mix(in srgb, var(--secondary-color) 70%, #fff); outline-offset: 2px; }
      .cadastro-acesso__corpo { padding: 20px 24px; }
      .cadastro-acesso__info { margin: 0 0 10px; font-size: 0.78125rem; color: var(--on-surface); }
      .cadastro-acesso__corpo h3 { margin: 18px 0 8px; font-family: var(--font-ui); font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: var(--on-surface); }
      .cadastro-acesso__corpo h3 small { font-weight: 500; text-transform: none; letter-spacing: 0; }
      .cadastro-acesso__previa { margin: 0; padding: 14px 16px; border: 1px dashed color-mix(in srgb, var(--primary-color) 30%, transparent); border-radius: 10px; background: color-mix(in srgb, var(--secondary-color) 8%, var(--white)); font-size: 0.78125rem; color: var(--charcoal); }
      .cadastro-acesso__dominios { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
      .cadastro-acesso__dominio { padding: 4px 10px; border-radius: var(--radius-pill); background: var(--wine-tint); color: var(--primary-color); font-size: 0.71875rem; font-weight: 600; }
      .cadastro-acesso__acoes { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 20px; }
      .cadastro-acesso__sujo { margin-right: auto; font-size: 0.78125rem; color: var(--on-surface); }
    `,
  ],
})
export class CadastroAcessoComponent implements OnInit {
  private serv = inject(CadastroAcessoService);

  config: CadastroAcessoConfig | null = null;
  carregando = false;
  salvando = false;
  erro = '';

  /** Valor em edição. Só vai para o servidor quando o operador salva. */
  exigirEmailCorporativo = false;
  private valorPersistido = false;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.serv.obter().subscribe({
      next: (config) => {
        this.config = config;
        this.valorPersistido = config.ExigirEmailCorporativoNoCadastro;
        this.exigirEmailCorporativo = config.ExigirEmailCorporativoNoCadastro;
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Não foi possível carregar a configuração.';
        this.carregando = false;
      },
    });
  }

  alternar(valor: boolean): void {
    // Só muda o rascunho local — nada é enviado aqui.
    this.exigirEmailCorporativo = valor;
  }

  /** Há mudança pendente? É o que habilita "Salvar alterações". */
  get sujo(): boolean {
    return this.exigirEmailCorporativo !== this.valorPersistido;
  }

  rotuloEstado(): string {
    // Badge sempre com texto (PRD §7).
    return this.exigirEmailCorporativo ? 'Ativo' : 'Inativo';
  }

  salvar(): void {
    if (!this.sujo) return;
    this.salvando = true;
    this.serv.salvar(this.exigirEmailCorporativo).subscribe({
      next: () => {
        this.salvando = false;
        this.carregar();
      },
      error: (resposta) => {
        this.salvando = false;
        this.erro = resposta?.error?.message ?? 'Não foi possível salvar.';
      },
    });
  }

  descartar(): void {
    this.exigirEmailCorporativo = this.valorPersistido;
  }

  /** Formato do Figma: `Inativo → Ativo` · `Rafael Andrade · 01/08/2026 14:12`. */
  eventosHistorico(): AurumHistoryEvento[] {
    if (!this.config) return [];
    return this.config.Historico.map((item) => ({
      evento: `${item.ValorAnterior} → ${item.ValorNovo}`,
      timestamp: new Date(item.DataHora).toLocaleString('pt-BR'),
      autor: item.Usuario ?? '—',
    }));
  }
}
