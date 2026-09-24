import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgenciasService } from '../../core/services/comercial.service';
import { AgenciaForm, AgenciaListItem, AgenciaPorCnpj } from '../../core/models/comercial.models';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumFilterBarComponent } from '../../shared/aurum/aurum-filter-bar.component';
import { AurumModalComponent } from '../../shared/aurum/aurum-modal.component';
import { PermissionService } from '../../core/auth/permission.service';
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
    AurumFilterBarComponent,
    AurumModalComponent,
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
      .agencias__ico { width: 16px; height: 16px; }
      .agencias__abas { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .agencias__prefixo { font-size: 0.8125rem; font-weight: 600; color: var(--on-surface); }
      .agencias__aba { border: none; border-radius: var(--radius-pill); padding: 8px 16px; background: var(--chip-bg); color: var(--on-surface); font: inherit; font-size: 0.8125rem; font-weight: 600; cursor: pointer; }
      .agencias__aba[aria-selected='true'] { background: var(--primary-color); color: var(--paper-bg); }
      .agencias__empresa { display: flex; flex-direction: column; gap: 2px; }
      .agencias__empresa strong { font-family: var(--font-display); font-size: 0.9375rem; color: var(--primary-dark); }
      .agencias__razao { margin: 2px 0 0; font-size: 0.75rem; color: var(--on-surface); }
      .agencias__contato { display: flex; flex-direction: column; gap: 2px; font-size: 0.78125rem; color: var(--on-surface); }
      .agencias__campanhas { font-size: 0.75rem; color: var(--on-surface); white-space: nowrap; }
      .agencias__campanhas strong { color: var(--charcoal); }
      .agencias__acoes { display: inline-flex; gap: 8px; }
      .agencias__cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
      .agencias__card { display: flex; flex-direction: column; padding: 20px; background: var(--white); border: 1px solid var(--line-subtle); border-radius: var(--radius-card); box-shadow: var(--shadow-card); }
      .agencias__card-topo { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
      .agencias__card-topo h3 { margin: 0; font-size: 1.0625rem; font-weight: 700; }
      .agencias__info { display: flex; flex-direction: column; gap: 6px; margin: 14px 0; padding: 12px; border-radius: var(--radius-search); background: var(--paper-bg); font-size: 0.75rem; color: var(--on-surface); }
      .agencias__info > span { display: flex; align-items: center; gap: 6px; }
      .agencias__info .aurum-ico { width: 13px; height: 13px; color: var(--primary-color); }
      .agencias__info strong { color: var(--primary-dark); }
      .agencias__card-rodape { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 12px; border-top: 1px solid var(--line-search); }
      .agencias__modal-sub { margin: 4px 0 0; font-size: 0.78125rem; color: var(--on-surface); }
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

  readonly afiliadaId = inject(PermissionService).getAfiliadaId();
  private buscaTimer?: ReturnType<typeof setTimeout>;

  /** Busca ao digitar, com espera curta — o Figma não tem botão "Aplicar". */
  buscar(termo: string): void {
    this.busca = termo;
    clearTimeout(this.buscaTimer);
    this.buscaTimer = setTimeout(() => this.carregar(), 300);
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
