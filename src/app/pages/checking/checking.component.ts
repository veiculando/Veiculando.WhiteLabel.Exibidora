import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { mensagemDeErro } from '../../core/http/api-error';
import { ItemChecking, PiAutorizada } from '../../core/models/wl.models';
import { CheckingService } from '../../core/services/checking.service';
import { PhotoUploadComponent } from '../../shared/photo-upload.component';
import { environment } from '../../../environments/environment';

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
    imports: [CommonModule, PhotoUploadComponent],
    template: `
    <div class="wl-page">
      <h1 class="wl-page__titulo">Checking de veiculação</h1>
      <p class="wl-page__descricao">
        Comprovação fotográfica das inserções autorizadas.
      </p>
    
      @if (erro) {
        <div class="wl-estado wl-estado--erro">{{ erro }}</div>
      }
      @if (aviso) {
        <div class="wl-estado wl-estado--sucesso">{{ aviso }}</div>
      }
    
      <!-- ---------------------------------------------- Tela 1: PIs -->
      @if (!piSelecionada) {
        @if (carregandoPis) {
          <div class="wl-estado wl-estado--carregando">
            Carregando pedidos de inserção…
          </div>
        }
        @if (!carregandoPis && pis.length === 0) {
          <div class="wl-estado wl-estado--vazio">
            Nenhum pedido de inserção autorizado para checking.
          </div>
        }
        @if (pis.length > 0) {
          <div class="wl-tabela--rolavel">
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
                @for (pi of pis; track pi) {
                  <tr>
                    <td>{{ pi.codigo }}</td>
                    <td>{{ pi.dataCadastro | date: 'dd/MM/yyyy' }}</td>
                    <td>{{ pi.valorLiquidoVeiculacao | currency: 'BRL' : 'symbol' : '1.2-2' }}</td>
                    <td>
                      <button class="wl-btn wl-btn--link" type="button" (click)="abrirPi(pi)">
                        Ver itens
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    
      <!-- ------------------------------------- Telas 2 e 3: itens e envio -->
      @if (piSelecionada; as pi) {
        <div class="wl-toolbar">
          <button class="wl-btn wl-btn--secundario" type="button" (click)="voltar()">
            ← Voltar para as PIs
          </button>
          <span class="contexto">
            PI <strong>{{ pi.codigo }}</strong> ·
            {{ pi.dataCadastro | date: 'dd/MM/yyyy' }}
          </span>
        </div>
        <div class="wl-estado aviso-geo" role="status">
          Fotos enviadas do computador ficam salvas, mas não comprovam a posição
          de captura. O checking pode exigir revisão de geolocalização antes da aprovação.
        </div>
        @if (carregandoItens) {
          <div class="wl-estado wl-estado--carregando">
            Carregando itens da PI…
          </div>
        }
        @if (!carregandoItens && itens.length === 0) {
          <div class="wl-estado wl-estado--vazio">
            Esta PI não tem itens disponíveis para checking.
          </div>
        }
        @if (itens.length > 0) {
          <div class="wl-tabela--rolavel">
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
                @for (item of itens; track item) {
                  <tr>
                    <td>{{ item.idPedidoItem }}</td>
                    <td>{{ item.localDescricao || item.localCodigo || '—' }}</td>
                    <td>{{ item.pecaCodigo || '—' }}</td>
                    <td>
                      <span class="wl-etiqueta">{{ item.statusChecking || item.status }}</span>
                    </td>
                    <td>
                      <app-photo-upload
                        [uploadUrl]="bffUrl + '/checking/enviar-foto/' + item.idPedidoItem"
                        [listUrl]="bffUrl + '/checking/item/' + item.idPedidoItem + '/fotos'"
                        [limiteMb]="15" titulo="Comprovação do item"
                        (confirmado)="atualizarStatus()" />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [
        `
      .contexto {
        font-size: 0.875rem;
        color: var(--on-surface);
      }
      .aviso-geo {
        margin-bottom: 16px;
        background: var(--warning-bg);
        border: 1px solid var(--warning-border);
        color: var(--warning);
        font-size: 0.85rem;
      }
    `,
    ]
})
export class CheckingComponent implements OnInit {
  readonly bffUrl = environment.bffUrl;
  private service = inject(CheckingService);

  pis: PiAutorizada[] = [];
  piSelecionada: PiAutorizada | null = null;
  itens: ItemChecking[] = [];

  carregandoPis = false;
  carregandoItens = false;
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

  atualizarStatus(): void {
    const pi = this.piSelecionada;
    if (!pi) return;
    this.service.itensDaPi(pi.codigo).subscribe({
      next: itens => {
        // Preserva os componentes de upload e sua confirmação após a releitura.
        for (const item of this.itens) {
          const novo = itens.find(x => x.idPedidoItem === item.idPedidoItem);
          if (novo) Object.assign(item, novo);
        }
      },
      error: erro => this.erro = mensagemDeErro(erro, 'Foto salva; não foi possível atualizar a situação do item.'),
    });
  }

}
