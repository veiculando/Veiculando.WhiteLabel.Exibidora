/**
 * Respostas REAIS do BFF, capturadas do preview (login QA admin) e anonimizadas.
 *
 * Os specs das telas comerciais montam os componentes com estes objetos, não com
 * mocks escritos à mão: um mock repete o engano de quem o escreveu (foi assim que o
 * PascalCase passou verde — D1, VEI-SUP-27). Para recapturar, basta salvar de novo o
 * JSON do endpoint indicado em cada export.
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
import agenciaDetalhe from './agencia-detalhe.json';
import agenciaPorCnpj from './agencia-por-cnpj.json';
import agenciasLista from './agencias-lista.json';
import cadastroAcesso from './cadastro-acesso.json';
import campanhaDetalhe from './campanha-detalhe.json';
import campanhasLista from './campanhas-lista.json';
import kycFila from './kyc-fila.json';
import kycResumo from './kyc-resumo.json';

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
  cadastroAcesso: chaves<CadastroAcessoConfig>({
    exigirEmailCorporativoNoCadastro: true, dominiosBloqueados: true, dominiosEditaveis: true, historico: true,
  }),
};

/** Chaves presentes num objeto da fixture, ordenadas para comparar com `CHAVES`. */
export const chavesDe = (objeto: object): string[] => Object.keys(objeto).sort();
