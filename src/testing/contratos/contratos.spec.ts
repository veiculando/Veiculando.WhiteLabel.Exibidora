import {
  CHAVES,
  agenciaDetalheReal,
  agenciaPorCnpjReal,
  agenciasListaReal,
  cadastroAcessoReal,
  campanhaDetalheReal,
  campanhasListaReal,
  chavesDe,
  checkingListaReal,
  kycFilaReal,
  kycResumoReal,
  locaisListaReal,
  pedidosInsercaoListaReal,
} from './contratos';

/**
 * Trava o contrato comercial contra as respostas reais do BFF (D1, VEI-SUP-27).
 * Se o BFF renomear um campo, ou o modelo declarar um que não chega, isto quebra.
 */
describe('Contrato comercial — fixtures reais do BFF', () => {
  it('páginas usam itens/page/pageSize/total/totalPaginas', () => {
    for (const pagina of [agenciasListaReal(), kycFilaReal(), campanhasListaReal()]) {
      expect(chavesDe(pagina)).toEqual(CHAVES.pagina);
    }
  });

  it('AgenciaListItem bate campo a campo', () => {
    for (const item of agenciasListaReal().itens) expect(chavesDe(item)).toEqual(CHAVES.agenciaListItem);
  });

  it('AgenciaDetalhe e anunciantes vinculados batem campo a campo', () => {
    const detalhe = agenciaDetalheReal();
    expect(chavesDe(detalhe)).toEqual(CHAVES.agenciaDetalhe);
    for (const a of detalhe.anunciantesVinculados) expect(chavesDe(a)).toEqual(CHAVES.anuncianteVinculado);
  });

  it('AgenciaPorCnpj bate campo a campo', () => {
    expect(chavesDe(agenciaPorCnpjReal())).toEqual(CHAVES.agenciaPorCnpj);
  });

  it('KycFilaItem e responsável batem campo a campo', () => {
    for (const item of kycFilaReal().itens) {
      expect(chavesDe(item)).toEqual(CHAVES.kycFilaItem);
      if (item.responsavel != null) expect(chavesDe(item.responsavel)).toEqual(CHAVES.kycResponsavel);
    }
  });

  it('KycResumo mantém as chaves com o nome do enum (dicionário não é reescrito)', () => {
    expect(Object.keys(kycResumoReal())).toContain('PendenteVerificacao');
  });

  it('CampanhaListItem e período batem campo a campo', () => {
    for (const item of campanhasListaReal().itens) {
      expect(chavesDe(item)).toEqual(CHAVES.campanhaListItem);
      if (item.periodo != null) expect(chavesDe(item.periodo)).toEqual(CHAVES.campanhaPeriodo);
    }
  });

  it('CampanhaDetalhe bate campo a campo', () => {
    expect(chavesDe(campanhaDetalheReal())).toEqual(CHAVES.campanhaDetalhe);
  });

  it('CadastroAcessoConfig bate campo a campo', () => {
    expect(chavesDe(cadastroAcessoReal())).toEqual(CHAVES.cadastroAcesso);
  });
});

/** HF-5 (D8, D9, D14): as listagens que ganharam campos novos. */
describe('Contrato de listagens — fixtures reais do BFF (HF-5)', () => {
  it('LocalListItem bate campo a campo, com e sem peça', () => {
    const locais = locaisListaReal();
    for (const local of locais) expect(chavesDe(local)).toEqual(CHAVES.localListItem);
    expect(locais.some((l) => l.suporte != null), 'fixture precisa de um local com peça').toBe(true);
    expect(locais.some((l) => l.suporte == null), 'fixture precisa de um local sem peça').toBe(true);
  });

  it('PedidoInsercaoListItem, resumo e período batem campo a campo', () => {
    const pagina = pedidosInsercaoListaReal();
    expect(chavesDe(pagina)).toEqual(CHAVES.paginaPedidosInsercao);
    expect(chavesDe(pagina.resumo)).toEqual(CHAVES.pedidosInsercaoResumo);
    for (const pi of pagina.itens) {
      expect(chavesDe(pi)).toEqual(CHAVES.pedidoInsercaoListItem);
      if (pi.periodo != null) expect(chavesDe(pi.periodo)).toEqual(CHAVES.periodoVeiculacao);
    }
  });

  it('CheckoutListItem e período batem campo a campo', () => {
    const pagina = checkingListaReal();
    expect(chavesDe(pagina)).toEqual(CHAVES.pagina);
    for (const item of pagina.itens) {
      expect(chavesDe(item)).toEqual(CHAVES.checkoutListItem);
      if (item.periodo != null) expect(chavesDe(item.periodo)).toEqual(CHAVES.periodoVeiculacao);
    }
  });
});
