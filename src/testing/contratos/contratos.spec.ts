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
  cmsBannerDetalheReal,
  cmsBannerSalvoAvisosReal,
  cmsBannersListaReal,
  cmsDepoimentoDetalheReal,
  cmsDepoimentosListaReal,
  cmsDepoimentosResumoReal,
  cmsErroReal,
  cmsMarcaDetalheReal,
  cmsMarcasListaReal,
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

/** TP-4: contrato do CMS, fixtures copiadas do BFF (VEI-RD-19a). */
describe('Contrato CMS — fixtures reais do BFF (TP-4)', () => {
  it('listas usam o Pagina<T> comum', () => {
    for (const pagina of [cmsBannersListaReal(), cmsMarcasListaReal(), cmsDepoimentosListaReal()]) {
      expect(chavesDe(pagina)).toEqual(CHAVES.pagina);
    }
  });

  it('CmsBanner bate campo a campo, nos dois tipos de destino', () => {
    const banners = [...cmsBannersListaReal().itens, cmsBannerDetalheReal(), cmsBannerSalvoAvisosReal().item];
    for (const b of banners) expect(chavesDe(b)).toEqual(CHAVES.cmsBanner);
    const link = banners.find((b) => b.tipoDestino === 'link')!;
    const html = banners.find((b) => b.tipoDestino === 'html')!;
    expect(link.destino != null && link.htmlPath == null, 'link tem destino e htmlPath null').toBe(true);
    expect(html.htmlPath != null && html.destino == null, 'html tem htmlPath e destino null').toBe(true);
  });

  it('CmsMarca bate campo a campo', () => {
    for (const m of [...cmsMarcasListaReal().itens, cmsMarcaDetalheReal()]) expect(chavesDe(m)).toEqual(CHAVES.cmsMarca);
  });

  it('CmsDepoimento bate campo a campo, com company e avatarUrl presentes mesmo quando null', () => {
    const itens = [...cmsDepoimentosListaReal().itens, cmsDepoimentoDetalheReal()];
    for (const d of itens) expect(chavesDe(d)).toEqual(CHAVES.cmsDepoimento);
    expect(itens.some((d) => d.company == null && d.avatarUrl == null), 'fixture precisa de um sem empresa e sem foto').toBe(true);
  });

  it('resumo, salvo e erro batem campo a campo', () => {
    expect(chavesDe(cmsDepoimentosResumoReal())).toEqual(CHAVES.cmsDepoimentosResumo);
    expect(chavesDe(cmsBannerSalvoAvisosReal())).toEqual(CHAVES.cmsSalvo);
    expect(chavesDe(cmsErroReal())).toEqual(CHAVES.cmsErro);
  });

  it('nenhuma fixture traz registro ativo (ADR-CMS-004)', () => {
    const todos = [
      ...cmsBannersListaReal().itens, cmsBannerDetalheReal(), cmsBannerSalvoAvisosReal().item,
      ...cmsMarcasListaReal().itens, cmsMarcaDetalheReal(),
      ...cmsDepoimentosListaReal().itens, cmsDepoimentoDetalheReal(),
    ];
    expect(todos.every((r) => r.ativo === false)).toBe(true);
  });
});
