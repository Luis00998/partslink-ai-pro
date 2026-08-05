CREATE OR REPLACE VIEW public.admin_stats
WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM public.pecas)::bigint AS total_pecas,
  (SELECT count(*) FROM public.diagrama_catalogo WHERE ativo IS NOT false)::bigint AS total_diagramas,
  (SELECT count(*) FROM public.diagrama_item)::bigint AS total_itens_diagrama,
  (SELECT count(*) FROM public.veiculos)::bigint AS total_veiculos,
  (SELECT count(*) FROM public.clientes)::bigint AS total_clientes,
  (SELECT count(*) FROM public.orcamentos)::bigint AS total_orcamentos,
  (SELECT count(*) FROM public.historico_manutencao)::bigint AS total_historicos,
  (SELECT count(*) FROM public.servicos)::bigint AS total_servicos,
  (SELECT count(*) FROM public.historico_buscas)::bigint AS total_buscas,
  (SELECT count(*) FROM public.historico_buscas WHERE tipo = 'smart')::bigint AS buscas_smart,
  (SELECT count(*) FROM public.busca_cache)::bigint AS termos_em_cache,
  (SELECT coalesce(sum(hits), 0) FROM public.busca_cache)::bigint AS cache_hits,
  (SELECT count(*) FROM public.pecas WHERE fonte_url IS NOT NULL)::bigint AS pecas_via_ia,
  (SELECT count(*) FROM public.pecas WHERE fonte_confianca = 'baixa')::bigint AS pecas_aguardando_revisao,
  (SELECT count(DISTINCT coalesce(fabricante, marca)) FROM public.pecas WHERE coalesce(fabricante, marca) IS NOT NULL)::bigint AS total_fabricantes,
  (SELECT count(DISTINCT categoria) FROM public.pecas WHERE categoria IS NOT NULL)::bigint AS total_categorias,
  (SELECT count(*) FROM public.pecas WHERE imagem_url IS NOT NULL)::bigint AS pecas_com_imagem,
  (SELECT coalesce(sum(hits), 0) FROM public.busca_cache)::bigint AS economia_creditos;

GRANT SELECT ON public.admin_stats TO authenticated;
GRANT SELECT ON public.admin_stats TO service_role;