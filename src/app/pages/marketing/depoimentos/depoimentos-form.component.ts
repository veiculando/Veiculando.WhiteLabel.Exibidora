import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { mensagemDeErro } from '../../../core/http/api-error';
import { CmsDepoimento } from '../../../core/models/cms.models';
import { CmsService } from '../../../core/services/cms.service';
import { AurumButtonComponent } from '../../../shared/aurum/aurum-button.component';
import { AurumDropzoneComponent } from '../../../shared/aurum/aurum-dropzone.component';

const MB = 1024 * 1024;

/** Cabe no card da LP sem cortar. */
export const LIMITE_RELATO = 400;

export const TOAST_DEPOIMENTO_SALVO = 'Salvo. O site é atualizado em até 5 minutos.';

/**
 * Novo/editar depoimento — VEI-RD-8, Figma `173:1044`.
 *
 * Desvio do Figma: o formulário tem um campo "Empresa / Cargo", mas a lista do
 * mesmo Figma mostra as duas colunas separadas e o KPI conta empresas — então
 * são dois campos (`company` e `role`), ambos opcionais.
 *
 * Status nasce **Oculto** (ADR-CMS-004: o preview escreve em produção). Dado de
 * teste: nome fictício, sem citação atribuída a empresa real.
 */
@Component({
  selector: 'app-depoimentos-form',
  imports: [AurumButtonComponent, AurumDropzoneComponent],
  templateUrl: './depoimentos-form.component.html',
  styleUrls: ['../marketing-form.css'],
  styles: [
    `
      .dpf-contador { align-self: flex-end; font-size: 0.71875rem; color: var(--muted-ink); }
      .dpf-contador--excesso { font-weight: 700; color: var(--danger); }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class DepoimentosFormComponent implements OnInit, OnDestroy {
  private readonly cms = inject(CmsService);
  private readonly router = inject(Router);

  /** `:id` da rota; ausente em `/novo`. */
  @Input() id?: string;

  readonly limiteAvatar = 2 * MB;
  readonly limiteRelato = LIMITE_RELATO;

  readonly existente = signal<CmsDepoimento | null>(null);
  readonly carregando = signal(false);
  readonly erroCarga = signal('');

  readonly autor = signal('');
  readonly empresa = signal('');
  readonly cargo = signal('');
  readonly relato = signal('');
  readonly ordem = signal<number | null>(null);
  readonly publicado = signal(false);
  readonly avatar = signal<File | null>(null);

  readonly tentouSalvar = signal(false);
  readonly salvando = signal(false);
  readonly erroServidor = signal('');
  readonly toast = signal('');
  private toastTimer?: ReturnType<typeof setTimeout>;

  readonly edicao = computed(() => this.existente() != null);
  readonly caracteres = computed(() => this.relato().length);

  readonly erros = computed(() => {
    const erros: Partial<Record<'autor' | 'relato' | 'ordem', string>> = {};
    if (!this.autor().trim()) erros.autor = 'Informe o nome do autor.';
    if (!this.relato().trim()) erros.relato = 'Escreva o depoimento.';
    else if (this.relato().length > LIMITE_RELATO) {
      erros.relato = `O depoimento passa de ${LIMITE_RELATO} caracteres e não cabe no card do site.`;
    }
    const ordem = this.ordem();
    if (ordem != null && (!Number.isInteger(ordem) || ordem < 0)) erros.ordem = 'Use um número inteiro a partir de 0.';
    return erros;
  });

  ngOnInit(): void {
    if (this.id) this.carregar(this.id);
  }

  ngOnDestroy(): void {
    clearTimeout(this.toastTimer);
  }

  lerOrdem(valor: string): void {
    this.ordem.set(valor.trim() === '' ? null : Number(valor));
  }

  cancelar(): void {
    this.router.navigate(['/marketing/depoimentos']);
  }

  salvar(): void {
    this.tentouSalvar.set(true);
    this.erroServidor.set('');
    if (Object.keys(this.erros()).length > 0 || this.salvando()) return;

    this.salvando.set(true);
    const atual = this.existente();
    const requisicao = atual
      ? this.cms.atualizar('depoimentos', atual.id, this.formData())
      : this.cms.criar('depoimentos', this.formData());

    requisicao.subscribe({
      next: ({ item }) => {
        this.existente.set(item);
        this.publicado.set(item.ativo);
        this.avatar.set(null);
        this.salvando.set(false);
        this.mostrarToast(TOAST_DEPOIMENTO_SALVO);
      },
      error: (erro) => {
        // Avatar com magic bytes errados: 400 { message }. Os campos ficam.
        this.erroServidor.set(mensagemDeErro(erro, 'Não foi possível salvar o depoimento.'));
        this.salvando.set(false);
      },
    });
  }

  private carregar(id: string): void {
    this.carregando.set(true);
    this.cms.obter('depoimentos', id).subscribe({
      next: (depoimento) => {
        this.existente.set(depoimento);
        this.autor.set(depoimento.author);
        this.empresa.set(depoimento.company ?? '');
        this.cargo.set(depoimento.role ?? '');
        this.relato.set(depoimento.content);
        this.ordem.set(depoimento.displayOrder);
        this.publicado.set(depoimento.ativo);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erroCarga.set(mensagemDeErro(erro, 'Não foi possível carregar o depoimento.'));
        this.carregando.set(false);
      },
    });
  }

  private formData(): FormData {
    const dados = new FormData();
    dados.set('author', this.autor().trim());
    dados.set('content', this.relato().trim());
    // Vazio vai como vazio: no PUT, é assim que o operador apaga a empresa ou o cargo.
    dados.set('company', this.empresa().trim());
    dados.set('role', this.cargo().trim());
    const ordem = this.ordem();
    if (ordem != null) dados.set('displayOrder', String(ordem));
    dados.set('ativo', String(this.publicado()));
    const avatar = this.avatar();
    if (avatar) dados.set('avatar', avatar, avatar.name);
    return dados;
  }

  private mostrarToast(texto: string): void {
    this.toast.set(texto);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 6000);
  }
}
