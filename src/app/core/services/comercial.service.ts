import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AgenciaDetalhe,
  AgenciaForm,
  AgenciaListItem,
  AgenciaPorCnpj,
  CadastroAcessoConfig,
  CampanhaListItem,
  KycDecisao,
  KycDetalhe,
  KycFilaItem,
  KycResumo,
  Pagina,
  ProspeccaoSessao,
} from '../models/comercial.models';

/** Monta os query params ignorando o que é nulo, vazio ou indefinido. */
function params(valores: Record<string, unknown>): HttpParams {
  let http = new HttpParams();
  for (const [chave, valor] of Object.entries(valores)) {
    if (valor === null || valor === undefined || valor === '') continue;
    http = http.set(chave, String(valor));
  }
  return http;
}

/** Agências — VEI-RD-79. */
@Injectable({ providedIn: 'root' })
export class AgenciasService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/agencias`;

  listar(filtros: { status?: string; busca?: string; page?: number } = {}): Observable<Pagina<AgenciaListItem>> {
    return this.http.get<Pagina<AgenciaListItem>>(this.base, { params: params(filtros) });
  }

  obter(id: number): Observable<AgenciaDetalhe> {
    return this.http.get<AgenciaDetalhe>(`${this.base}/${id}`);
  }

  /**
   * Consulta prévia obrigatória antes de abrir o formulário: CNPJ já existente
   * propõe VÍNCULO, nunca um segundo cadastro (PRD §8.14).
   */
  porCnpj(cnpj: string): Observable<AgenciaPorCnpj> {
    return this.http.get<AgenciaPorCnpj>(`${this.base}/por-cnpj/${cnpj}`);
  }

  criar(dto: AgenciaForm): Observable<unknown> {
    return this.http.post(this.base, dto);
  }

  /** Condições comerciais: bonificação por volume e observações. */
  atualizar(id: number, dto: { BonificacaoVolume: number; ObservacoesAfiliada: string }): Observable<unknown> {
    return this.http.put(`${this.base}/${id}`, dto);
  }

  vincular(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/vincular`, {});
  }

  /**
   * Inativa ou reativa o VÍNCULO. É o que a linha da tabela chama de "excluir":
   * a `Agencia` permanece no Core, visível às outras exibidoras que a usam.
   */
  alterarStatus(id: number, ativo: boolean): Observable<unknown> {
    return this.http.patch(`${this.base}/${id}/status`, { Ativo: ativo });
  }
}

/** Análises de KYC — VEI-RD-80 e VEI-RD-81. */
@Injectable({ providedIn: 'root' })
export class KycService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/kyc`;

  fila(filtros: {
    tipo?: string;
    estado?: string;
    analistaId?: number;
    dataEnvio?: string;
    busca?: string;
    page?: number;
  } = {}): Observable<Pagina<KycFilaItem>> {
    return this.http.get<Pagina<KycFilaItem>>(`${this.base}/analises`, { params: params(filtros) });
  }

  /** Contagem dos 5 chips — reflete o MESMO conjunto filtrado da listagem. */
  resumo(filtros: { tipo?: string; analistaId?: number; dataEnvio?: string; busca?: string } = {}): Observable<KycResumo> {
    return this.http.get<KycResumo>(`${this.base}/analises/resumo`, { params: params(filtros) });
  }

  assumir(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/analises/${id}/assumir`, {});
  }

  detalhe(id: number): Observable<KycDetalhe> {
    return this.http.get<KycDetalhe>(`${this.base}/analises/${id}`);
  }

  aprovar(id: number, decisao: KycDecisao): Observable<unknown> {
    return this.http.post(`${this.base}/analises/${id}/aprovar`, decisao);
  }

  /** Exige `CamposPendentes` — a validação é do servidor, não do formulário. */
  ajustes(id: number, decisao: KycDecisao): Observable<unknown> {
    return this.http.post(`${this.base}/analises/${id}/ajustes`, decisao);
  }

  rejeitar(id: number, decisao: KycDecisao): Observable<unknown> {
    return this.http.post(`${this.base}/analises/${id}/rejeitar`, decisao);
  }

  suspender(id: number, decisao: KycDecisao): Observable<unknown> {
    return this.http.post(`${this.base}/analises/${id}/suspender`, decisao);
  }

  reativar(id: number, decisao: KycDecisao): Observable<unknown> {
    return this.http.post(`${this.base}/analises/${id}/reativar`, decisao);
  }

  /**
   * URL TEMPORÁRIA do documento. Pedida no momento do clique, nunca guardada:
   * um link emitido junto com a tela viveria enquanto a aba ficasse aberta, o que
   * é exatamente o que "temporária" existe para impedir.
   */
  urlDocumento(id: number): Observable<{ Url: string; ExpiraEm: string; TtlSegundos: number }> {
    return this.http.get<{ Url: string; ExpiraEm: string; TtlSegundos: number }>(
      `${this.base}/documentos/${id}/url`
    );
  }
}

/** Campanhas — VEI-RD-51. Somente leitura: nenhum método de mutação existe aqui. */
@Injectable({ providedIn: 'root' })
export class CampanhasService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/campanhas`;

  listar(filtros: { status?: string; anuncianteId?: number; agenciaId?: number; periodoId?: number; nome?: string; page?: number } = {}): Observable<Pagina<CampanhaListItem>> {
    return this.http.get<Pagina<CampanhaListItem>>(this.base, { params: params(filtros) });
  }

  obter(id: number): Observable<unknown> {
    return this.http.get(`${this.base}/${id}`);
  }
}

/** Configurações → Cadastro e acesso — VEI-RD-82. */
@Injectable({ providedIn: 'root' })
export class CadastroAcessoService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/config/cadastro-acesso`;

  obter(): Observable<CadastroAcessoConfig> {
    return this.http.get<CadastroAcessoConfig>(this.base);
  }

  salvar(exigir: boolean): Observable<unknown> {
    return this.http.put(this.base, { ExigirEmailCorporativoNoCadastro: exigir });
  }
}

/** Prospecção — VEI-RD-83. */
@Injectable({ providedIn: 'root' })
export class ProspeccaoService {
  private http = inject(HttpClient);
  private readonly base = `${environment.bffUrl}/prospeccao`;

  abrirSessao(anuncianteId?: number): Observable<ProspeccaoSessao> {
    return this.http.post<ProspeccaoSessao>(`${this.base}/sessao`, { AnuncianteId: anuncianteId ?? null });
  }
}
