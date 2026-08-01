-- Create a view for admin dashboard statistics
CREATE OR REPLACE VIEW public.admin_stats AS
SELECT
  (SELECT COUNT(*) FROM public.pecas) as total_pecas,
  (SELECT COUNT(*) FROM public.historico_buscas) as total_pesquisas,
  (SELECT COUNT(*) FROM public.historico_buscas WHERE (resultado->>'origem') = 'banco_interno') as pesquisas_banco,
  (SELECT COUNT(*) FROM public.historico_buscas WHERE (resultado->>'origem') = 'pesquisa_inteligente') as pesquisas_internet,
  (SELECT COUNT(*) FROM public.pecas WHERE importado_em IS NOT NULL) as pecas_enriquecidas;

GRANT SELECT ON public.admin_stats TO authenticated;
GRANT SELECT ON public.admin_stats TO service_role;

-- Index for searching codes and descriptions with performance in mind
-- Using trgm for fuzzy search as it's more flexible for partial codes
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_pecas_descricao_trgm ON public.pecas USING gin (descricao gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pecas_codigo_original_trgm ON public.pecas USING gin (codigo_original gin_trgm_ops);
