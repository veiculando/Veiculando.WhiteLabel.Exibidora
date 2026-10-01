/**
 * Contrato de `api/wl/cms/*` — espelha os DTOs do BFF
 * (`Controllers/Cms/CmsContrato.cs`, TP-3 seção 1) e as fixtures em
 * `src/testing/contratos/cms-*.json`, copiadas sem edição.
 *
 * Tudo em camelCase. Campo nulo vem PRESENTE com `null`, nunca omitido; por
 * isso as telas comparam com `!= null`. `imageUrl`/`avatarUrl` são URL pública
 * completa, prontas para o `<img>`. Datas são ISO 8601 com offset.
 *
 * A lista reusa o `Pagina<T>` do contrato comercial
 * (`{ itens, page, pageSize, total, totalPaginas }`) — mesmo `WlPagina<T>` no BFF.
 */
export type { Pagina } from './comercial.models';

export type CmsTipoDestino = 'link' | 'html';

/** `status` da query: o BFF aceita os três; `todos` equivale a omitir. */
export type CmsStatusFiltro = 'todos' | 'ativo' | 'inativo';

export type CmsRecurso = 'banners' | 'marcas' | 'depoimentos';

export interface CmsBanner {
  id: string;
  title: string;
  imageUrl: string;
  tipoDestino: CmsTipoDestino;
  /** `https://…` ou `#secao`; `null` no banner html. */
  destino: string | null;
  /** Relativo ao bucket (`banners/{uuid}.html`); `null` no banner link. */
  htmlPath: string | null;
  displayOrder: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CmsMarca {
  id: string;
  name: string;
  imageUrl: string;
  displayOrder: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CmsDepoimento {
  id: string;
  author: string;
  role: string | null;
  company: string | null;
  content: string;
  avatarUrl: string | null;
  displayOrder: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

/** `GET depoimentos/resumo`. `empresas` conta `company` distintas não vazias. */
export interface CmsDepoimentosResumo {
  total: number;
  publicados: number;
  ocultos: number;
  novosNoMes: number;
  empresas: number;
}

/** Resposta de POST (201), PUT e PATCH `/status`. `avisos` vem sempre, vazio quando não há. */
export interface CmsSalvo<T> {
  item: T;
  avisos: string[];
}

/** Corpo de 400/404/413/503: mensagem em português, pronta para exibir. */
export interface CmsErro {
  message: string;
}

export interface CmsFiltro {
  busca?: string;
  status?: CmsStatusFiltro;
  /** Só depoimentos. */
  empresa?: string;
  /** Só depoimentos, `yyyy-MM-dd`. */
  desde?: string;
  page?: number;
  pageSize?: number;
}

/** Tipo do item por recurso — deixa `listar('marcas')` já tipado como `CmsMarca`. */
export interface CmsItens {
  banners: CmsBanner;
  marcas: CmsMarca;
  depoimentos: CmsDepoimento;
}
