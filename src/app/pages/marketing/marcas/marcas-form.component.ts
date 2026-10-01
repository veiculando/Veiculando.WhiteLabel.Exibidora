import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { mensagemDeErro } from '../../../core/http/api-error';
import { CmsMarca } from '../../../core/models/cms.models';
import { CmsService } from '../../../core/services/cms.service';
import { AurumButtonComponent } from '../../../shared/aurum/aurum-button.component';
import { AurumDropzoneComponent } from '../../../shared/aurum/aurum-dropzone.component';

const MB = 1024 * 1024;

export const TOAST_MARCA_SALVA = 'Salvo. O site é atualizado em até 5 minutos.';

/**
 * Nova/editar marca parceira — VEI-RD-12, Figma `173:553`.
 *
 * Aceita SVG, além de PNG/JPG/WebP. O SVG passa pelo sanitizador do BFF, que
 * recusa `<script>`, handlers `on*` e referências externas com 400; a
 * mensagem aparece como veio, e nome e ordem continuam preenchidos.
 *
 * Mesmos desvios de Banners: campo de ordem (em branco = fim da fila) e
 * status Inativo por default no novo (ADR-CMS-004).
 */
@Component({
  selector: 'app-marcas-form',
  imports: [AurumButtonComponent, AurumDropzoneComponent],
  templateUrl: './marcas-form.component.html',
  styleUrls: ['../marketing-form.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class MarcasFormComponent implements OnInit, OnDestroy {
  private readonly cms = inject(CmsService);
  private readonly router = inject(Router);

  /** `:id` da rota; ausente em `/nova`. */
  @Input() id?: string;

  readonly limiteLogo = 2 * MB;

  readonly existente = signal<CmsMarca | null>(null);
  readonly carregando = signal(false);
  readonly erroCarga = signal('');

  readonly nome = signal('');
  readonly ordem = signal<number | null>(null);
  readonly ativo = signal(false);
  readonly logo = signal<File | null>(null);

  readonly tentouSalvar = signal(false);
  readonly salvando = signal(false);
  readonly erroServidor = signal('');
  readonly toast = signal('');
  private toastTimer?: ReturnType<typeof setTimeout>;

  readonly edicao = computed(() => this.existente() != null);

  readonly erros = computed(() => {
    const erros: Partial<Record<'nome' | 'logo' | 'ordem', string>> = {};
    if (!this.nome().trim()) erros.nome = 'Informe o nome da marca.';
    if (!this.edicao() && this.logo() == null) erros.logo = 'Envie o logo da marca.';
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
    this.router.navigate(['/marketing/marcas']);
  }

  salvar(): void {
    this.tentouSalvar.set(true);
    this.erroServidor.set('');
    if (Object.keys(this.erros()).length > 0 || this.salvando()) return;

    this.salvando.set(true);
    const atual = this.existente();
    const requisicao = atual
      ? this.cms.atualizar('marcas', atual.id, this.formData())
      : this.cms.criar('marcas', this.formData());

    requisicao.subscribe({
      next: ({ item }) => {
        this.existente.set(item);
        this.logo.set(null);
        this.salvando.set(false);
        this.mostrarToast(TOAST_MARCA_SALVA);
      },
      error: (erro) => {
        // SVG inseguro ou magic bytes errados: 400 { message }. Nome e ordem ficam.
        this.erroServidor.set(mensagemDeErro(erro, 'Não foi possível salvar a marca.'));
        this.salvando.set(false);
      },
    });
  }

  private carregar(id: string): void {
    this.carregando.set(true);
    this.cms.obter('marcas', id).subscribe({
      next: (marca) => {
        this.existente.set(marca);
        this.nome.set(marca.name);
        this.ordem.set(marca.displayOrder);
        this.ativo.set(marca.ativo);
        this.carregando.set(false);
      },
      error: (erro) => {
        this.erroCarga.set(mensagemDeErro(erro, 'Não foi possível carregar a marca.'));
        this.carregando.set(false);
      },
    });
  }

  private formData(): FormData {
    const dados = new FormData();
    dados.set('name', this.nome().trim());
    const ordem = this.ordem();
    if (ordem != null) dados.set('displayOrder', String(ordem));
    dados.set('ativo', String(this.ativo()));
    const logo = this.logo();
    if (logo) dados.set('imagem', logo, logo.name);
    return dados;
  }

  private mostrarToast(texto: string): void {
    this.toast.set(texto);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 6000);
  }
}
