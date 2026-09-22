import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgenciasService } from '../../core/services/comercial.service';
import { AgenciaForm, AgenciaListItem, AgenciaPorCnpj } from '../../core/models/comercial.models';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumCardComponent } from '../../shared/aurum/aurum-card.component';
import { AurumFilterFieldComponent } from '../../shared/aurum/aurum-filter-field.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent } from '../../shared/aurum/aurum-status-pill.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';
import { AurumTextInputComponent } from '../../shared/aurum/aurum-text-input.component';
import {
  AurumViewSelectorComponent,
  AurumViewSelectorModo,
} from '../../shared/aurum/aurum-view-selector.component';

type Aba = 'Todos' | 'Ativo' | 'Inativo';

/**
 * Agências — VEI-RD-79, frames `233:11873` (lista) e `154:3549` (formulário).
 *
 * As colunas seguem o FIGMA, não o PRD §5.5: o design consolidou CNPJ, cidade,
 * e-mail e telefone num único bloco "Informações de Contato" e **não tem coluna de
 * status de KYC** — o KYC ganhou tela própria (`154:4927`, VEI-RD-80). Reproduzir a
 * lista do PRD aqui duplicaria essa tela numa coluna estreita.
 */
@Component({
  selector: 'app-agencias',
  imports: [
    FormsModule,
    AurumPageHeaderComponent,
    AurumButtonComponent,
    AurumCardComponent,
    AurumFilterFieldComponent,
    AurumTextInputComponent,
    AurumStatusPillComponent,
    AurumViewSelectorComponent,
    AurumTableComponent,
    AurumTableRowComponent,
    AurumTableCellComponent,
    AurumTableHeaderCellComponent,
  ],
  templateUrl: './agencias.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .agencias__barra { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 16px; }
      .agencias__busca { flex: 1 1 320px; }
      .agencias__abas { display: flex; gap: 4px; }
      .agencias__aba { background: none; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 7px 14px; cursor: pointer; font: inherit; color: var(--on-surface); }
      .agencias__aba[aria-selected='true'] { background: color-mix(in srgb, var(--primary-color) 12%, transparent); border-color: var(--primary-color); font-weight: 600; }
      .agencias__contato { display: flex; flex-direction: column; gap: 2px; font-size: 0.82rem; }
      .agencias__empresa { display: flex; flex-direction: column; gap: 2px; }
      .agencias__razao { font-size: 0.8rem; color: var(--on-surface); }
      .agencias__acoes { display: flex; gap: 6px; }
      .agencias__cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
      .agencias__vazio { padding: 32px; text-align: center; color: var(--on-surface); }
      .agencias__form { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
      .agencias__form-acoes { display: flex; gap: 8px; margin-top: 16px; }
      .agencias__aviso { margin: 12px 0; padding: 12px; border-radius: var(--radius-sm); background: color-mix(in srgb, var(--secondary-color) 14%, transparent); }
    `,
  ],
})
export class AgenciasComponent implements OnInit {
  private serv = inject(AgenciasService);

  agencias: AgenciaListItem[] = [];
  total = 0;
  carregando = false;
  erro = '';

  busca = '';
  aba: Aba = 'Todos';
  readonly abas: Aba[] = ['Todos', 'Ativo', 'Inativo'];
  modo: AurumViewSelectorModo = 'lista';

  /** Passo 1 do cadastro: o CNPJ é consultado ANTES de o formulário abrir. */
  formAberto = false;
  cnpjConsulta = '';
  consultaCnpj: AgenciaPorCnpj | null = null;
  consultaMensagem = '';
  form: AgenciaForm | null = null;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.erro = '';
    this.serv.listar({ status: this.aba, busca: this.busca }).subscribe({
      next: (pagina) => {
        this.agencias = pagina.Itens;
        this.total = pagina.Total;
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Não foi possível carregar as agências.';
        this.carregando = false;
      },
    });
  }

  selecionarAba(aba: Aba): void {
    this.aba = aba;
    this.carregar();
  }

  tomDoStatus(status: number): 'sucesso' | 'neutro' {
    return status === 1 ? 'sucesso' : 'neutro';
  }

  rotuloDoStatus(status: number): string {
    // Badge sempre com texto (PRD §7): a cor sozinha não é legível para quem não
    // distingue as duas, e não sobrevive a uma captura em preto e branco.
    return status === 1 ? 'Ativo' : 'Inativo';
  }

  /**
   * Rótulo da ação que o Figma desenhou como lixeira.
   *
   * O ícone de exclusão prometeria destruição irreversível, que não é o que
   * acontece: o PRD §8.5 manda inativar o vínculo e manter a `Agencia` no Core,
   * onde outras exibidoras podem estar usando. Divergência registrada ao design.
   */
  rotuloDaAcaoDeStatus(agencia: AgenciaListItem): string {
    return agencia.Status === 1 ? 'Inativar' : 'Reativar';
  }

  alternarStatus(agencia: AgenciaListItem): void {
    const ativar = agencia.Status !== 1;
    const acao = ativar ? 'reativar' : 'inativar';
    if (!confirm(`Deseja ${acao} o vínculo com ${agencia.Nome}? A agência permanece cadastrada no sistema.`)) return;

    this.serv.alterarStatus(agencia.Id, ativar).subscribe({
      next: () => this.carregar(),
      error: (resposta) => {
        this.erro = resposta?.error?.message ?? 'Não foi possível alterar o vínculo.';
      },
    });
  }

  abrirConsultaCnpj(): void {
    this.formAberto = true;
    this.form = null;
    this.consultaCnpj = null;
    this.consultaMensagem = '';
    this.cnpjConsulta = '';
  }

  consultarCnpj(): void {
    this.consultaCnpj = null;
    this.consultaMensagem = '';
    this.serv.porCnpj(this.cnpjConsulta).subscribe({
      next: (achada) => {
        // CNPJ existente propõe VÍNCULO — nunca uma segunda Agencia (PRD §8.14).
        this.consultaCnpj = achada;
        this.consultaMensagem = achada.JaVinculadaAEstaAfiliada
          ? `${achada.Nome} já está vinculada a esta exibidora.`
          : `${achada.Nome} já existe no sistema. Vincule em vez de cadastrar.`;
      },
      error: () => {
        // 404 aqui é o caminho feliz: não há agência com este CNPJ, o cadastro segue.
        this.form = this.formVazio(this.cnpjConsulta);
        this.consultaMensagem = 'Nenhuma agência com este CNPJ. Preencha o cadastro.';
      },
    });
  }

  vincular(): void {
    if (!this.consultaCnpj) return;
    this.serv.vincular(this.consultaCnpj.Id).subscribe({
      next: () => {
        this.fecharForm();
        this.carregar();
      },
      error: (resposta) => {
        this.consultaMensagem = resposta?.error?.message ?? 'Não foi possível vincular.';
      },
    });
  }

  salvar(): void {
    if (!this.form) return;
    this.serv.criar(this.form).subscribe({
      next: () => {
        this.fecharForm();
        this.carregar();
      },
      error: (resposta) => {
        this.erro = resposta?.error?.message ?? 'Não foi possível salvar a agência.';
      },
    });
  }

  fecharForm(): void {
    this.formAberto = false;
    this.form = null;
    this.consultaCnpj = null;
    this.consultaMensagem = '';
  }

  private formVazio(cnpj: string): AgenciaForm {
    return {
      Nome: '',
      RazaoSocial: '',
      Cnpj: cnpj,
      Cidade: '',
      Uf: '',
      Telefone: '',
      Email: '',
      Site: '',
      Logradouro: '',
      Numero: '',
      Complemento: '',
      Bairro: '',
      Cep: '',
      InscricaoEstadual: '',
      InscricaoMunicipal: '',
      BonificacaoVolume: 0,
      ObservacoesAfiliada: '',
    };
  }
}
