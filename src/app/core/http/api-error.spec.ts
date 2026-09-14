import { HttpErrorResponse } from '@angular/common/http';
import { mensagemDeErro } from './api-error';

/**
 * O BFF responde erro em tres formatos diferentes, e a tela precisa mostrar
 * algo util em todos. Estes testes fixam esse contrato.
 */
describe('mensagemDeErro', () => {
  const erroCom = (status: number, error: unknown) =>
    new HttpErrorResponse({ status, error, statusText: 'erro' });

  it('extrai `message` de BadRequest/NotFound dos controllers', () => {
    const erro = erroCom(400, { message: 'Já existe um usuário com este e-mail.' });

    expect(mensagemDeErro(erro)).toBe('Já existe um usuário com este e-mail.');
  });

  it('junta as notificacoes do dominio quando o corpo e um array', () => {
    // `BadRequest(entidade.Notifications)` — o formato do Notifiable.
    const erro = erroCom(400, [
      { property: 'Email', message: 'E-mail inválido.' },
      { property: 'Senha', message: 'Senha muito curta.' },
    ]);

    const msg = mensagemDeErro(erro);
    expect(msg).toContain('E-mail inválido.');
    expect(msg).toContain('Senha muito curta.');
  });

  it('usa o corpo quando ele e string', () => {
    expect(mensagemDeErro(erroCom(400, 'Erro em texto puro'))).toBe('Erro em texto puro');
  });

  it('sem conexao, explica que o servidor nao respondeu', () => {
    // status 0 e o que o browser reporta quando a requisicao nem sai.
    expect(mensagemDeErro(erroCom(0, null))).toContain('Sem conexão');
  });

  it('traduz os status sem corpo para mensagens acionaveis', () => {
    expect(mensagemDeErro(erroCom(401, null))).toContain('Sessão expirada');
    expect(mensagemDeErro(erroCom(403, null))).toContain('permissão');
    expect(mensagemDeErro(erroCom(404, null))).toContain('não encontrado');
    expect(mensagemDeErro(erroCom(413, null))).toContain('limite');
  });

  it('traduz 501 — usado pelos uploads que ainda nao persistem', () => {
    // Os endpoints de foto validam o arquivo e respondem 501 em vez de fingir
    // sucesso. A tela precisa dizer isso ao operador.
    expect(mensagemDeErro(erroCom(501, null))).toContain('não implementado');
  });

  it('prefere a mensagem do servidor a traducao generica do status', () => {
    const erro = erroCom(501, {
      message: 'O envio da comprovação fotográfica ainda não está disponível. Nenhuma foto foi salva.',
    });

    expect(mensagemDeErro(erro)).toContain('Nenhuma foto foi salva');
  });

  it('cai no padrao para o que nao for HttpErrorResponse', () => {
    expect(mensagemDeErro(new Error('erro de javascript'), 'padrão')).toBe('padrão');
  });
});
