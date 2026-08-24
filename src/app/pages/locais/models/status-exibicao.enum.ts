/**
 * Espelha StatusExibicaoEnum do Core (Veiculando.Domain/Entities/EntityDefBase).
 * Não reordenar: os valores numéricos são o contrato com o BFF/Core.
 */
export enum StatusExibicao {
  Deletado = -1,
  Inativo = 0,
  Ativo = 1,
  AprovacaoPendente = 2,
}

export const STATUS_EXIBICAO_LABEL: Record<StatusExibicao, string> = {
  [StatusExibicao.Deletado]: 'Excluído',
  [StatusExibicao.Inativo]: 'Inativo',
  [StatusExibicao.Ativo]: 'Ativo',
  [StatusExibicao.AprovacaoPendente]: 'Aguardando aprovação',
};
