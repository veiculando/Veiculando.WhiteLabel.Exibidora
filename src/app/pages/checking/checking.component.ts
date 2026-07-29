import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { mensagemDeErro } from '../../core/http/api-error';
import { ItemChecking, PiAutorizada } from '../../core/models/wl.models';
import { CheckingService, LIMITE_FOTO_CHECKING_BYTES } from '../../core/services/checking.service';

/**
 * Checking de veiculação — card `9dd345d3`.
 *
 * Três telas em sequência, espelhando o `checking.component` do
 * `Veiculando.Afiliada`: **PIs autorizadas → itens da PI → envio da foto**.
 * Modeladas como um único componente com estado de navegação porque a transição
 * é linear e sempre carrega o contexto da etapa anterior; três rotas exigiriam
 * recarregar a PI a cada passo.
 *
 * O que NÃO está aqui, deliberadamente:
 *  - **Relatório de Conformidade.** Verificado que não existe no core, no
 *    `Veiculando.Afiliada` nem no `Veiculando.Reports`. Seria feature nova, não
 *    port — e o BDD correspondente foi retirado do relatório de conformidade.
 *
 * 📌 Em aberto com o produto (não bloqueia): o domínio pode reprovar a foto com
 * `Erro de Geolocalização` (`CheckingFoto.cs` valida as coordenadas de captura).
 * Um arquivo escolhido do disco por um browser não carrega essa informação, então
 * o upload web pode cair sistematicamente nesse status. O canal projetado para
 * captura geolocalizada é o app mobile (`Veiculando.Checking`), que está vazio.
 * A UI avisa o operador em vez de silenciar o risco.
 */
@Component({
  selector: 'app-checking',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wl-page">
      <h1 class="wl-page__titulo">Checking de veiculação</h1>
      <p class="wl-page__descricao">
        Comprovação fotográfica das inserções autorizadas.
      </p>

      <div class="wl-estado wl-estado--erro" *ngIf="erro">{{ erro }}</div>
      <div class="wl-estado wl-estado--sucesso" *ngIf="aviso">{{ aviso }}</div>

      <!-- ---------------------------------------------- Tela 1: PIs -->
      <ng-container *ngIf="!piSelecionada">
        <div class="wl-estado wl-estado--carregando" *ngIf="carregandoPis">
          Carregando pedidos de inserção…
        </div>

        <div class="wl-estado wl-estado--vazio" *ngIf="!carregandoPis && pis.length === 0">
          Nenhum pedido de inserção autorizado para checking.
        </div>

        <div class="wl-tabela--rolavel" *ngIf="pis.length > 0">
          <table class="wl-tabela">
            <thead>
              <tr>
                <th>PI</th>
                <th>Emissão</th>
                <th>Valor líquido</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let pi of pis">
                <td>{{ pi.codigo }}</td>
                <td>{{ pi.dataCadastro | date: 'dd/MM/yyyy' }}</td>
                <td>{{ pi.valorLiquidoVeiculacao | currency: 'BRL' : 'symbol' : '1.2-2' }}</td>
                <td>
                  <button class="wl-btn wl-btn--link" type="button" (click)="abrirPi(pi)">
                    Ver itens
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>

      <!-- ------------------------------------- Telas 2 e 3: itens e envio -->
      <ng-container *ngIf="piSelecionada as pi">
        <div class="wl-toolbar">
          <button class="wl-btn wl-btn--secundario" type="button" (click)="voltar()">
            ← Voltar para as PIs
          </button>
          <span class="contexto">
            PI <strong>{{ pi.codigo }}</strong> ·
            {{ pi.dataCadastro | date: 'dd/MM/yyyy' }}
          </span>
        </div>

        <div class="wl-estado aviso-geo">
          As fotos são validadas quanto à geolocalização de captura. Um arquivo sem
          esses dados pode ser marcado como <em>Erro de geolocalização</em> pela
          equipe de conferência.
        </div>

        <div class="wl-estado wl-estado--carregando" *ngIf="carregandoItens">
          Carregando itens da PI…
        </div>

        <div class="wl-estado wl-estado--vazio" *ngIf="!carregandoItens && itens.length === 0">
          Esta PI não tem itens disponíveis para checking.
        </div>

        <div class="wl-tabela--rolavel" *ngIf="itens.length > 0">
          <table class="wl-tabela">
            <thead>
              <tr>
                <th>Item</th>
                <th>Local</th>
                <th>Peça</th>
                <th>Status</th>
                <th>Enviar foto</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of itens">
                <td>{{ item.idPedidoItem }}</td>
                <td>{{ item.localDescricao || item.localCodigo || '—' }}</td>
                <td>{{ item.pecaCodigo || '—' }}</td>
                <td>
                  <span class="wl-etiqueta">{{ item.statusChecking || item.status }}</span>
                </td>
                <td>
                  <input
                    type="file"
                    accept="image/*"
                    [disabled]="enviandoItem === item.idPedidoItem"
                    (change)="enviarFoto(item, $event)"
                  />
                  <span class="enviando" *ngIf="enviandoItem === item.idPedidoItem">enviando…</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="limite">Tamanho máximo por foto: {{ limiteMb }} MB.</p>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .contexto {
        font-size: 0.875rem;
        color: var(--on-surface);
      }
      .aviso-geo {
        margin-bottom: 16px;
        background: #fff4d6;
        border: 1px solid #f0d79a;
        color: #6b4b00;
        font-size: 0.85rem;
      }
      .enviando {
        margin-left: 8px;
        font-size: 0.75rem;
        color: var(--on-surface);
      }
      .limite {
        margin-top: 12px;
        font-size: 0.75rem;
        color: var(--on-surface);
      }
    `,
  ],
})
export class CheckingComponent implements OnInit {
  private service = inject(CheckingService);

  readonly limiteMb = Math.round(LIMITE_FOTO_CHECKING_BYTES / (1024 * 1024));

  pis: PiAutorizada[] = [];
  piSelecionada: PiAutorizada | null = null;
  itens: ItemChecking[] = [];

  carregandoPis = false;
  carregandoItens = false;
  enviandoItem: number | null = null;
  erro: string | null = null;
  aviso: string | null = null;

  ngOnInit(): void {
    this.carregarPis();
  }

  carregarPis(): void {
    this.carregandoPis = true;
    this.erro = null;

    this.service.pisAutorizadas().subscribe({
      next: (pis) => {
        this.pis = pis;
        this.carregandoPis = false;
      },
      error: (erro: unknown) => {
        this.carregandoPis = false;
        this.erro = mensagemDeErro(erro, 'Não foi possível carregar os pedidos de inserção.');
      },
    });
  }

  abrirPi(pi: PiAutorizada): void {
    this.piSelecionada = pi;
    this.itens = [];
    this.aviso = null;
    this.erro = null;
    this.carregandoItens = true;

    this.service.itensDaPi(pi.codigo).subscribe({
      next: (itens) => {
        this.itens = itens;
        this.carregandoItens = false;
      },
      error: (erro: unknown) => {
        this.carregandoItens = false;
        this.erro = mensagemDeErro(erro, 'Não foi possível carregar os itens desta PI.');
      },
    });
  }

  voltar(): void {
    this.piSelecionada = null;
    this.itens = [];
    this.erro = null;
    this.aviso = null;
  }

  enviarFoto(item: ItemChecking, evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;

    this.erro = null;
    this.aviso = null;

    // Validação local antes do upload: o BFF recusa acima de 15MB, mas sem esta
    // checagem o operador aguardaria a subida inteira para receber o 400.
    if (arquivo.size > LIMITE_FOTO_CHECKING_BYTES) {
      this.erro = `A foto tem ${this.emMb(arquivo.size)} MB e o limite é ${this.limiteMb} MB. Escolha um arquivo menor.`;
      input.value = '';
      return;
    }

    this.enviandoItem = item.idPedidoItem;

    this.service.enviarFoto(item.idPedidoItem, arquivo).subscribe({
      next: (resposta) => {
        this.enviandoItem = null;
        input.value = '';
        // Recarrega os itens para o status refletir o envio. O aviso é definido
        // DEPOIS porque `abrirPi` limpa as mensagens da tela ao recomeçar.
        if (this.piSelecionada) this.abrirPi(this.piSelecionada);
        this.aviso = resposta.message;
      },
      error: (erro: unknown) => {
        this.enviandoItem = null;
        this.erro = mensagemDeErro(erro, 'Não foi possível enviar a foto.');
        input.value = '';
      },
    });
  }

  private emMb(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(1);
  }
}
