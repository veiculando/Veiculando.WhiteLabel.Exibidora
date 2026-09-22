import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CadastroAcessoService } from '../../../core/services/comercial.service';
import { CadastroAcessoConfig } from '../../../core/models/comercial.models';
import { AurumButtonComponent } from '../../../shared/aurum/aurum-button.component';
import { AurumCardComponent } from '../../../shared/aurum/aurum-card.component';
import { AurumCheckboxComponent } from '../../../shared/aurum/aurum-checkbox.component';
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
    AurumCardComponent,
    AurumCheckboxComponent,
    AurumHistoryCardComponent,
    AurumStatusPillComponent,
  ],
  templateUrl: './cadastro-acesso.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .cadastro-acesso__bloco { margin-bottom: 20px; }
      .cadastro-acesso__linha { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
      .cadastro-acesso__info { font-size: 0.85rem; color: var(--on-surface); margin: 4px 0; }
      .cadastro-acesso__previa { padding: 12px; border-radius: var(--radius-sm); background: color-mix(in srgb, var(--primary-color) 8%, transparent); font-style: italic; }
      .cadastro-acesso__dominios { display: flex; gap: 8px; flex-wrap: wrap; list-style: none; padding: 0; margin: 8px 0; }
      .cadastro-acesso__dominio { border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 4px 10px; font-size: 0.85rem; }
      .cadastro-acesso__acoes { display: flex; gap: 8px; align-items: center; margin-top: 16px; }
      .cadastro-acesso__sujo { color: var(--on-surface); font-size: 0.85rem; }
      .cadastro-acesso__vazio { padding: 24px; color: var(--on-surface); }
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
