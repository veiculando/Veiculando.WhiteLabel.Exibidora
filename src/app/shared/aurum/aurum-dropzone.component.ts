import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  signal,
} from '@angular/core';

/**
 * Área de upload do Figma Aurum (`178:6`, "Imagem do banner"): caixa
 * tracejada em ouro, clique ou arraste, com texto de formato e limite.
 *
 * Valida tipo e tamanho ANTES do envio — arquivo errado nunca vira requisição.
 * A validação do BFF (magic bytes, SVG seguro, HTML) continua sendo a que vale;
 * esta só poupa a ida e volta e dá a mensagem na hora.
 *
 * `accept` mistura MIME (`image/png`) e extensão (`.html`). Casa o arquivo que
 * bater em qualquer um dos dois: o navegador deriva o MIME da extensão, então um
 * `.gif` chega como `image/gif` e é barrado. Conteúdo disfarçado (PDF renomeado
 * para `.jpg`) só o BFF pega, e a tela mostra o 400 dele.
 *
 * Emite o `File` válido, ou `null` quando o operador troca por um inválido —
 * o formulário não pode continuar segurando o arquivo anterior sem mostrar.
 */
@Component({
  selector: 'aurum-dropzone',
  imports: [],
  template: `
    <label
      class="dz"
      [class.dz--arrastando]="arrastando()"
      [class.dz--erro]="!!erro()"
      (dragover)="aoArrastar($event)"
      (dragleave)="arrastando.set(false)"
      (drop)="aoSoltar($event)"
    >
      <input class="dz__input" type="file" [attr.accept]="accept" [attr.aria-label]="rotuloAcessivel || rotulo" (change)="aoSelecionar($event)" />
      @if (previewExibido(); as src) {
        <img class="dz__preview" [src]="src" alt="Pré-visualização do arquivo" />
      } @else {
        <span class="dz__circulo" aria-hidden="true"></span>
      }
      @if (arquivo(); as selecionado) {
        <span class="dz__nome">{{ selecionado.name }}</span>
      } @else if (nomeAtual) {
        <span class="dz__nome">Atual: {{ nomeAtual }}</span>
      }
      <span class="dz__rotulo">{{ rotulo }}</span>
      <span class="dz__dica">{{ dica }}</span>
    </label>
    @if (erro()) {
      <p class="dz__erro" role="alert">{{ erro() }}</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host { display: block; }
      .dz { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 160px; padding: 28px 16px; border: 1px dashed var(--secondary-color); border-radius: 12px; background: var(--paper-bg); text-align: center; cursor: pointer; }
      .dz:focus-within { outline: 2px solid var(--primary-color); outline-offset: 2px; }
      .dz--arrastando { background: var(--gold-tint); }
      .dz--erro { border-color: var(--danger); }
      .dz__input { position: absolute; width: 1px; height: 1px; opacity: 0; }
      .dz__circulo { width: 36px; height: 36px; border-radius: 50%; background: var(--gold-tint); }
      .dz__preview { max-width: 100%; max-height: 120px; border-radius: 8px; object-fit: contain; }
      .dz__nome { font-size: 0.75rem; color: var(--on-surface); overflow-wrap: anywhere; }
      .dz__rotulo { font-size: 0.8125rem; font-weight: 600; color: var(--primary-dark); }
      .dz__dica { font-size: 0.6875rem; color: var(--muted-ink); }
      .dz__erro { margin: 8px 0 0; font-size: 0.75rem; font-weight: 600; color: var(--danger); }
    `,
  ],
})
export class AurumDropzoneComponent implements OnDestroy {
  /** Lista separada por vírgula, MIME e/ou extensão — como o `accept` nativo. */
  @Input() accept = 'image/png,image/jpeg,image/webp';
  @Input() maxBytes = 5 * 1024 * 1024;
  /** Nome humano dos formatos, usado na dica e no erro ("PNG, JPG ou WebP"). */
  @Input() formatos = 'PNG, JPG ou WebP';
  @Input() recomendacao = '';
  @Input() rotulo = 'Clique para enviar ou arraste a imagem';
  @Input() rotuloAcessivel = '';
  /** Imagem já salva (edição); some quando o operador escolhe outra. */
  @Input() previewAtual: string | null = null;
  /** Arquivo já salvo sem pré-visualização possível (hotsite HTML). */
  @Input() nomeAtual: string | null = null;
  /** `false` para arquivo não-imagem: não tenta pré-visualizar. */
  @Input() imagem = true;

  @Output() arquivoChange = new EventEmitter<File | null>();

  readonly arquivo = signal<File | null>(null);
  readonly erro = signal('');
  readonly arrastando = signal(false);
  private readonly previewLocal = signal<string | null>(null);

  get limiteMb(): string {
    return formatarMb(this.maxBytes);
  }

  get dica(): string {
    const partes = [this.formatos, this.recomendacao ? `recomendado ${this.recomendacao}` : '', `até ${this.limiteMb} MB`];
    return partes.filter(Boolean).join(' — ');
  }

  previewExibido(): string | null {
    if (!this.imagem) return null;
    return this.previewLocal() ?? (this.arquivo() ? null : this.previewAtual);
  }

  aoArrastar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastando.set(true);
  }

  aoSoltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastando.set(false);
    const arquivo = evento.dataTransfer?.files?.[0];
    if (arquivo) this.receber(arquivo);
  }

  aoSelecionar(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    // Limpa o valor para o mesmo arquivo poder ser escolhido de novo depois de um erro.
    input.value = '';
    if (arquivo) this.receber(arquivo);
  }

  /** Público para a tela e os specs: mesmo caminho do clique e do arraste. */
  receber(arquivo: File): void {
    const problema = this.validar(arquivo);
    this.trocarPreview(null);
    if (problema) {
      this.erro.set(problema);
      this.arquivo.set(null);
      this.arquivoChange.emit(null);
      return;
    }
    this.erro.set('');
    this.arquivo.set(arquivo);
    if (this.imagem) this.trocarPreview(criarUrl(arquivo));
    this.arquivoChange.emit(arquivo);
  }

  validar(arquivo: File): string | null {
    if (!this.tipoAceito(arquivo)) return `Formato não aceito. Envie ${this.formatos}.`;
    if (arquivo.size > this.maxBytes) {
      return `O arquivo tem ${formatarMb(arquivo.size)} MB e passa do limite de ${this.limiteMb} MB.`;
    }
    return null;
  }

  ngOnDestroy(): void {
    this.trocarPreview(null);
  }

  private tipoAceito(arquivo: File): boolean {
    const nome = arquivo.name.toLowerCase();
    const tipo = (arquivo.type || '').toLowerCase();
    return this.accept
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .some((item) => (item.startsWith('.') ? nome.endsWith(item) : tipo === item));
  }

  private trocarPreview(url: string | null): void {
    const anterior = this.previewLocal();
    if (anterior) revogarUrl(anterior);
    this.previewLocal.set(url);
  }
}

function formatarMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return Number.isInteger(mb) ? String(mb) : mb.toFixed(1).replace('.', ',');
}

// jsdom não implementa createObjectURL; sem ele, só não há pré-visualização.
function criarUrl(arquivo: File): string | null {
  return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(arquivo) : null;
}

function revogarUrl(url: string): void {
  if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
}
