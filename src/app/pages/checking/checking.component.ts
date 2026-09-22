import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { mensagemDeErro } from '../../core/http/api-error';
import { ItemChecking, PiAutorizada } from '../../core/models/wl.models';
import { CheckingService } from '../../core/services/checking.service';
import { PhotoUploadComponent } from '../../shared/photo-upload.component';
import { environment } from '../../../environments/environment';
import { AurumButtonComponent } from '../../shared/aurum/aurum-button.component';
import { AurumPageHeaderComponent } from '../../shared/aurum/aurum-page-header.component';
import { AurumStatusPillComponent } from '../../shared/aurum/aurum-status-pill.component';
import {
  AurumTableCellComponent,
  AurumTableComponent,
  AurumTableHeaderCellComponent,
  AurumTableRowComponent,
} from '../../shared/aurum/aurum-table.component';

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
    imports: [
      CommonModule,
      PhotoUploadComponent,
      AurumPageHeaderComponent,
      AurumButtonComponent,
      AurumStatusPillComponent,
      AurumTableComponent,
      AurumTableRowComponent,
      AurumTableCellComponent,
      AurumTableHeaderCellComponent,
    ],
    template: `
    <aurum-page-header
      titulo="Checking de veiculação"
      subtitulo="Comprovação fotográfica das inserções autorizadas."
    />

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
            <table aurumTable>
              <thead>
                <tr aurumTableRow>
                  <th aurumTableHeaderCell>PI</th>
                  <th aurumTableHeaderCell>Emissão</th>
                  <th aurumTableHeaderCell>Valor líquido</th>
                  <th aurumTableHeaderCell></th>
                </tr>
              </thead>
              <tbody>
                @for (pi of pis; track pi) {
                  <tr aurumTableRow>
                    <td aurumTableCell>{{ pi.codigo }}</td>
                    <td aurumTableCell>{{ pi.dataCadastro | date: 'dd/MM/yyyy' }}</td>
                    <td aurumTableCell>{{ pi.valorLiquidoVeiculacao | currency: 'BRL' : 'symbol' : '1.2-2' }}</td>
                    <td aurumTableCell>
                      <aurum-button variante="ghost" (click)="abrirPi(pi)">
                        Ver itens
                      </aurum-button>
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
          <aurum-button variante="outline" (click)="voltar()">
            ← Voltar para as PIs
          </aurum-button>
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
            <table aurumTable>
              <thead>
                <tr aurumTableRow>
                  <th aurumTableHeaderCell>Item</th>
                  <th aurumTableHeaderCell>Local</th>
                  <th aurumTableHeaderCell>Peça</th>
                  <th aurumTableHeaderCell>Status</th>
                  <th aurumTableHeaderCell>Enviar foto</th>
                </tr>
              </thead>
              <tbody>
                @for (item of itens; track item) {
                  <tr aurumTableRow>
                    <td aurumTableCell>{{ item.idPedidoItem }}</td>
                    <td aurumTableCell>{{ item.localDescricao || item.localCodigo || '—' }}</td>
                    <td aurumTableCell>{{ item.pecaCodigo || '—' }}</td>
                    <td aurumTableCell>
                      <aurum-status-pill [rotulo]="item.statusChecking || item.status" tom="neutro" />
                    </td>
                    <td aurumTableCell>
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
