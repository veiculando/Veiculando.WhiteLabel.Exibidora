/**
 * Respostas REAIS do BFF, capturadas do preview (login QA admin) e anonimizadas.
 *
 * Os specs das telas comerciais montam os componentes com estes objetos, não com
 * mocks escritos à mão: um mock repete o engano de quem o escreveu (foi assim que o
 * PascalCase passou verde — D1, VEI-SUP-27). Para recapturar, basta salvar de novo o
 * JSON do endpoint indicado em cada export.
 *
 * Exceção: locais, PIs e checking (HF-5) foram capturados do BFF da branch do
 * HF-5 rodando contra SQL Server real (Testcontainers, `ListagensLacunasHf5Tests`),
 * porque os campos novos ainda não estavam no preview. São respostas do
 * controller real, com a massa sintética daqueles testes. Recapturar do preview
 * depois do deploy.
 */
import {
  AgenciaDetalhe,
  AgenciaListItem,
  AgenciaPorCnpj,
  CadastroAcessoConfig,
  CampanhaDetalhe,
  CampanhaListItem,
  CampanhaPeriodo,
  KycFilaItem,
  KycResumo,
  Pagina,
} from '../../app/core/models/comercial.models';
import {
  CheckoutListItem,
  PaginaPedidosInsercao,
  PedidoInsercaoListItem,
  PedidosInsercaoResumo,
  PeriodoVeiculacao,
} from '../../app/core/models/wl.models';
import {
  CmsBanner,
  CmsDepoimento,
  CmsDepoimentosResumo,
  CmsErro,
  CmsMarca,
  CmsSalvo,
} from '../../app/core/models/cms.models';
import { LocalListItem } from '../../app/pages/locais/models/local.model';
import agenciaDetalhe from './agencia-detalhe.json';
import agenciaPorCnpj from './agencia-por-cnpj.json';
import agenciasLista from './agencias-lista.json';
import cadastroAcesso from './cadastro-acesso.json';
import campanhaDetalhe from './campanha-detalhe.json';
import campanhasLista from './campanhas-lista.json';
import checkingLista from './checking-lista.json';
import cmsBannerDetalhe from './cms-banner-detalhe.json';
import cmsBannerSalvoAvisos from './cms-banner-salvo-avisos.json';
import cmsBannersLista from './cms-banners-lista.json';
import cmsDepoimentoDetalhe from './cms-depoimento-detalhe.json';
import cmsDepoimentosLista from './cms-depoimentos-lista.json';
import cmsDepoimentosResumo from './cms-depoimentos-resumo.json';
import cmsErro from './cms-erro.json';
import cmsMarcaDetalhe from './cms-marca-detalhe.json';
import cmsMarcasLista from './cms-marcas-lista.json';
import kycFila from './kyc-fila.json';
import kycResumo from './kyc-resumo.json';
import locaisLista from './locais-lista.json';
import pedidosInsercaoLista from './pedidos-insercao-lista.json';

/** Cópia profunda: um teste que muta a fixture não pode contaminar o próximo. */
const copia = <T>(valor: unknown): T => structuredClone(valor) as T;

/** `GET /api/wl/agencias?status=Todos` */
export const agenciasListaReal = () => copia<Pagina<AgenciaListItem>>(agenciasLista);
/** `GET /api/wl/agencias/1` */
export const agenciaDetalheReal = () => copia<AgenciaDetalhe>(agenciaDetalhe);
/** `GET /api/wl/agencias/por-cnpj/11111111000191` */
export const agenciaPorCnpjReal = () => copia<AgenciaPorCnpj>(agenciaPorCnpj);
/** `GET /api/wl/kyc/analises` */
export const kycFilaReal = () => copia<Pagina<KycFilaItem>>(kycFila);
/** `GET /api/wl/kyc/analises/resumo` — chaves de dicionário, por isso PascalCase. */
export const kycResumoReal = () => copia<KycResumo>(kycResumo);
/** `GET /api/wl/campanhas` */
export const campanhasListaReal = () => copia<Pagina<CampanhaListItem>>(campanhasLista);
/** `GET /api/wl/campanhas/1` */
export const campanhaDetalheReal = () => copia<CampanhaDetalhe>(campanhaDetalhe);
/** `GET /api/wl/config/cadastro-acesso` */
export const cadastroAcessoReal = () => copia<CadastroAcessoConfig>(cadastroAcesso);
/** `GET /api/wl/locais` — array cru; o segundo local não tem peça (colunas null). */
export const locaisListaReal = () => copia<LocalListItem[]>(locaisLista);
/** `GET /api/wl/pedidos-insercao?pageSize=100` — página + resumo. */
export const pedidosInsercaoListaReal = () => copia<PaginaPedidosInsercao>(pedidosInsercaoLista);
/** `GET /api/wl/checking?pageSize=100` */
export const checkingListaReal = () => copia<Pagina<CheckoutListItem>>(checkingLista);

/*
 * CMS (TP-4): fixtures do BFF (`Veiculando.WhiteLabel.Api.Tests/Contratos/`,
 * VEI-RD-19a), copiadas SEM edição. O `CmsContratoTests` do BFF faz ida e volta
 * de cada uma pelo DTO, então renomear um campo lá quebra o teste de lá, e aqui
 * o `contratos.spec.ts` quebra na próxima cópia. Todos os registros são
 * fictícios e inativos, com host de Storage fictício.
 */
/** `GET /api/wl/cms/banners?page=2&pageSize=10` — um link e um html. */
export const cmsBannersListaReal = () => copia<Pagina<CmsBanner>>(cmsBannersLista);
/** `GET /api/wl/cms/banners/{id}` — tipo link. */
export const cmsBannerDetalheReal = () => copia<CmsBanner>(cmsBannerDetalhe);
/** `POST|PUT /api/wl/cms/banners` — html com um aviso de URL relativa. */
export const cmsBannerSalvoAvisosReal = () => copia<CmsSalvo<CmsBanner>>(cmsBannerSalvoAvisos);
/** `GET /api/wl/cms/marcas` — uma logo SVG e uma PNG. */
export const cmsMarcasListaReal = () => copia<Pagina<CmsMarca>>(cmsMarcasLista);
/** `GET /api/wl/cms/marcas/{id}` */
export const cmsMarcaDetalheReal = () => copia<CmsMarca>(cmsMarcaDetalhe);
/** `GET /api/wl/cms/depoimentos` — o segundo tem `company` e `avatarUrl` null. */
export const cmsDepoimentosListaReal = () => copia<Pagina<CmsDepoimento>>(cmsDepoimentosLista);
/** `GET /api/wl/cms/depoimentos/{id}` */
export const cmsDepoimentoDetalheReal = () => copia<CmsDepoimento>(cmsDepoimentoDetalhe);
/** `GET /api/wl/cms/depoimentos/resumo` */
export const cmsDepoimentosResumoReal = () => copia<CmsDepoimentosResumo>(cmsDepoimentosResumo);
/** Corpo de 400/404/503 — a mensagem do 503 é esta. */
export const cmsErroReal = () => copia<CmsErro>(cmsErro);

/**
 * Lista das chaves de um modelo. O `Record<keyof T, true>` obriga a listar TODAS —
 * campo novo no modelo sem entrada aqui não compila.
 */
const chaves = <T>(mapa: Record<keyof T, true>): string[] => Object.keys(mapa).sort();

export const CHAVES = {
  pagina: chaves<Pagina<unknown>>({ itens: true, page: true, pageSize: true, total: true, totalPaginas: true }),
  agenciaListItem: chaves<AgenciaListItem>({
    id: true, nome: true, razaoSocial: true, cnpj: true, cidade: true, uf: true,
    email: true, telefone: true, status: true, campanhas: true,
  }),
  agenciaDetalhe: chaves<AgenciaDetalhe>({
    id: true, nome: true, razaoSocial: true, cnpj: true, cidade: true, uf: true, email: true,
    telefone: true, status: true, site: true, inscricaoEstadual: true, inscricaoMunicipal: true,
    logoUrl: true, bonificacaoVolume: true, observacoesAfiliada: true, dataVinculo: true,
    vendaDireta: true, anunciantesVinculados: true,
  }),
  anuncianteVinculado: chaves<AgenciaDetalhe['anunciantesVinculados'][number]>({
    id: true, nome: true, razaoSocial: true, comissaoAgencia: true, dataInicioContrato: true, dataExpiracaoContrato: true,
  }),
  agenciaPorCnpj: chaves<AgenciaPorCnpj>({
    id: true, nome: true, razaoSocial: true, cnpj: true, jaVinculadaAEstaAfiliada: true, propostaDeVinculo: true,
  }),
  kycFilaItem: chaves<KycFilaItem>({
    id: true, tipo: true, estado: true, dataEnvio: true, analistaId: true, analistaNome: true,
    nome: true, razaoSocial: true, cnpj: true, responsavel: true,
  }),
  kycResponsavel: chaves<NonNullable<KycFilaItem['responsavel']>>({ nome: true, cpf: true, email: true }),
  campanhaListItem: chaves<CampanhaListItem>({
    id: true, codigo: true, nome: true, status: true, dataInicioPrevisto: true, dataFimPrevisto: true,
    anunciante: true, agencia: true, periodo: true, pecas: true, valorTotal: true,
  }),
  campanhaPeriodo: chaves<CampanhaPeriodo>({ id: true, codigo: true, periodicidade: true, dataInicio: true, dataFim: true }),
  campanhaDetalhe: chaves<CampanhaDetalhe>({
    id: true, codigo: true, nome: true, produto: true, job: true, status: true, dataInicioPrevisto: true,
    dataFimPrevisto: true, verba: true, anunciante: true, agencia: true, pedidos: true,
  }),
  localListItem: chaves<LocalListItem>({
    timeStamp: true, id: true, codigo: true, descricao: true, cidade: true, uf: true, fonteOrigem: true,
    fonteTimestamp: true, statusExibicao: true, endereco: true, suporte: true, formatoDimensao: true,
    valorPadrao: true, periodicidade: true,
  }),
  pedidoInsercaoListItem: chaves<PedidoInsercaoListItem>({
    id: true, codigo: true, dataCadastro: true, dataPedido: true, status: true, campanha: true, agencia: true,
    anunciante: true, valorLiquidoVeiculacao: true, itensCount: true, cidade: true, qtdCidades: true, periodo: true,
  }),
  paginaPedidosInsercao: chaves<PaginaPedidosInsercao>({
    itens: true, page: true, pageSize: true, total: true, totalPaginas: true, resumo: true,
  }),
  pedidosInsercaoResumo: chaves<PedidosInsercaoResumo>({
    totalPIs: true, totalPecas: true, valorLiquidoTotal: true, porStatus: true,
  }),
  checkoutListItem: chaves<CheckoutListItem>({
    id: true, status: true, dataCadastro: true, dataAtualizacao: true, piCodigo: true, campanha: true,
    anunciante: true, itensPi: true, itensChecados: true, itensAprovados: true, itensRecebidos: true,
    cidades: true, periodo: true,
  }),
  periodoVeiculacao: chaves<PeriodoVeiculacao>({ id: true, rotulo: true, dataInicio: true, dataFim: true, quantidade: true }),
  cadastroAcesso: chaves<CadastroAcessoConfig>({
    exigirEmailCorporativoNoCadastro: true, dominiosBloqueados: true, dominiosEditaveis: true, historico: true,
  }),
  cmsBanner: chaves<CmsBanner>({
    id: true, title: true, imageUrl: true, tipoDestino: true, destino: true, htmlPath: true,
    displayOrder: true, ativo: true, createdAt: true, updatedAt: true,
  }),
  cmsMarca: chaves<CmsMarca>({
    id: true, name: true, imageUrl: true, displayOrder: true, ativo: true, createdAt: true, updatedAt: true,
  }),
  cmsDepoimento: chaves<CmsDepoimento>({
    id: true, author: true, role: true, company: true, content: true, avatarUrl: true,
    displayOrder: true, ativo: true, createdAt: true, updatedAt: true,
  }),
  cmsDepoimentosResumo: chaves<CmsDepoimentosResumo>({
    total: true, publicados: true, ocultos: true, novosNoMes: true, empresas: true,
  }),
  cmsSalvo: chaves<CmsSalvo<unknown>>({ item: true, avisos: true }),
  cmsErro: chaves<CmsErro>({ message: true }),
};

/** Chaves presentes num objeto da fixture, ordenadas para comparar com `CHAVES`. */
export const chavesDe = (objeto: object): string[] => Object.keys(objeto).sort();
