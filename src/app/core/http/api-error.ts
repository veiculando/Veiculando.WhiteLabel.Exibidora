import { HttpErrorResponse } from '@angular/common/http';

/**
 * Traduz um erro HTTP do BFF em uma mensagem exibivel.
 *
 * O BFF responde de tres formas diferentes, todas tratadas aqui:
 *  - `{ message: "..." }`               — BadRequest/NotFound dos controllers
 *  - `[{ property, message }, ...]`     — `BadRequest(entidade.Notifications)`,
 *                                        as notificacoes do dominio (Notifiable)
 *  - corpo vazio                        — 401/403/500
 */
export function mensagemDeErro(erro: unknown, padrao = 'Não foi possível completar a operação.'): string {
  if (!(erro instanceof HttpErrorResponse)) {
    return padrao;
  }

  if (erro.status === 0) {
    return 'Sem conexão com o servidor. Verifique se o BFF está em execução.';
  }

  const corpo = erro.error;

  if (typeof corpo === 'string' && corpo.trim()) {
    return corpo;
  }

  if (Array.isArray(corpo)) {
    const mensagens = corpo
      .map((n) => (typeof n === 'string' ? n : n?.message ?? n?.Message))
      .filter(Boolean);
    if (mensagens.length) {
      return mensagens.join(' ');
    }
  }

  if (corpo && typeof corpo === 'object') {
    const message = (corpo as Record<string, unknown>)['message'] ?? (corpo as Record<string, unknown>)['Message'];
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  switch (erro.status) {
    case 401:
      return 'Sessão expirada. Faça login novamente.';
    case 403:
      return 'Você não tem permissão para esta operação.';
    case 404:
      return 'Registro não encontrado.';
    case 413:
      return 'Arquivo maior do que o limite aceito pelo servidor.';
    case 501:
      return 'Recurso ainda não implementado no servidor.';
    default:
      return padrao;
  }
}
