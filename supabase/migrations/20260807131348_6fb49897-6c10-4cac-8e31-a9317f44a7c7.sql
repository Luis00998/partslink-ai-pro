-- 1) VEICULOS: catálogo global de veículos identificados por VIN
ALTER TABLE public.veiculos ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.veiculos ALTER COLUMN marca DROP NOT NULL;
ALTER TABLE public.veiculos ALTER COLUMN modelo DROP NOT NULL;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS combustivel text;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS cambio text;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS tracao text;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS fabricante text;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS pais text;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS cilindrada text;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS potencia text;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS cabine text;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS serie text;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS ultimo_acesso timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS confianca text NOT NULL DEFAULT 'media';
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS fonte text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_veiculos_vin_unico ON public.veiculos (upper(vin)) WHERE vin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_veiculos_motor ON public.veiculos (public.normalizar_texto(motor)) WHERE motor IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_veiculos_ano ON public.veiculos (ano);
CREATE INDEX IF NOT EXISTS idx_veiculos_fabricante ON public.veiculos (public.normalizar_texto(fabricante)) WHERE fabricante IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_veiculos_ultimo_acesso ON public.veiculos (ultimo_acesso DESC);

-- leitura global do catálogo técnico de veículos (policies existentes preservadas)
CREATE POLICY "Authenticated read veiculos catalogo"
  ON public.veiculos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert veiculos globais"
  ON public.veiculos FOR INSERT TO authenticated WITH CHECK (owner_id IS NULL OR owner_id = auth.uid());
CREATE POLICY "Authenticated update veiculos globais"
  ON public.veiculos FOR UPDATE TO authenticated USING (owner_id IS NULL) WITH CHECK (owner_id IS NULL);

-- 2) VEICULO_PECAS: relacionamento N:N veículo <-> peça
CREATE TABLE IF NOT EXISTS public.veiculo_pecas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  peca_id uuid NOT NULL REFERENCES public.pecas(id) ON DELETE CASCADE,
  codigo_original text,
  codigo_interno text,
  codigo_paralelo text,
  observacoes text,
  origem text NOT NULL DEFAULT 'manual',
  confidence text NOT NULL DEFAULT 'media',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculo_pecas TO authenticated;
GRANT ALL ON public.veiculo_pecas TO service_role;
ALTER TABLE public.veiculo_pecas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read veiculo_pecas"
  ON public.veiculo_pecas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write veiculo_pecas"
  ON public.veiculo_pecas FOR INSERT TO authenticated WITH CHECK (created_by IS NULL OR created_by = auth.uid());
CREATE POLICY "Authenticated update veiculo_pecas"
  ON public.veiculo_pecas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Owner delete veiculo_pecas"
  ON public.veiculo_pecas FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE UNIQUE INDEX IF NOT EXISTS idx_veiculo_pecas_unico ON public.veiculo_pecas (veiculo_id, peca_id);
CREATE INDEX IF NOT EXISTS idx_veiculo_pecas_veiculo ON public.veiculo_pecas (veiculo_id);
CREATE INDEX IF NOT EXISTS idx_veiculo_pecas_peca ON public.veiculo_pecas (peca_id);
CREATE INDEX IF NOT EXISTS idx_veiculo_pecas_codigo ON public.veiculo_pecas (upper(codigo_original)) WHERE codigo_original IS NOT NULL;

CREATE TRIGGER trg_veiculo_pecas_updated BEFORE UPDATE ON public.veiculo_pecas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) CACHE: campos adicionais de rastreabilidade
ALTER TABLE public.busca_cache ADD COLUMN IF NOT EXISTS payload jsonb;
ALTER TABLE public.busca_cache ADD COLUMN IF NOT EXISTS cache_hit integer NOT NULL DEFAULT 0;
ALTER TABLE public.busca_cache ADD COLUMN IF NOT EXISTS fonte text;
ALTER TABLE public.busca_cache ADD COLUMN IF NOT EXISTS confianca text;
CREATE INDEX IF NOT EXISTS idx_busca_cache_tipo ON public.busca_cache (tipo);

-- 4) CATALOGO TECNICO GLOBAL: leitura compartilhada das peças (escrita segue do owner)
CREATE POLICY "Authenticated read catalogo tecnico"
  ON public.pecas FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_pecas_codigo_original_upper ON public.pecas (upper(codigo_original)) WHERE codigo_original IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pecas_codigo_interno_upper ON public.pecas (upper(codigo_interno)) WHERE codigo_interno IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pecas_codigo_paralelo_upper ON public.pecas (upper(codigo_paralelo)) WHERE codigo_paralelo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pecas_categoria_norm ON public.pecas (public.normalizar_texto(categoria)) WHERE categoria IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pecas_fabricante_norm ON public.pecas (public.normalizar_texto(fabricante)) WHERE fabricante IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pecas_marca_norm ON public.pecas (public.normalizar_texto(marca)) WHERE marca IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pecas_anos ON public.pecas (ano_inicial, ano_final);

-- 5) RPCs
CREATE OR REPLACE FUNCTION public.obter_veiculo_por_vin(p_vin text)
RETURNS SETOF public.veiculos
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.veiculos SET ultimo_acesso = now()
   WHERE vin IS NOT NULL AND upper(vin) = upper(trim(p_vin));
  RETURN QUERY
    SELECT * FROM public.veiculos
     WHERE vin IS NOT NULL AND upper(vin) = upper(trim(p_vin))
     LIMIT 1;
END; $$;

GRANT EXECUTE ON FUNCTION public.obter_veiculo_por_vin(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.obter_pecas_do_veiculo(p_veiculo_id uuid)
RETURNS TABLE(
  vinculo_id uuid, peca_id uuid, codigo_original text, codigo_interno text, codigo_paralelo text,
  descricao text, marca text, fabricante text, categoria text, subcategoria text,
  aplicacao text, imagem_url text, equivalencias jsonb, origem text, confidence text
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT vp.id, p.id, coalesce(vp.codigo_original, p.codigo_original),
         coalesce(vp.codigo_interno, p.codigo_interno), coalesce(vp.codigo_paralelo, p.codigo_paralelo),
         p.descricao, p.marca, p.fabricante, p.categoria, p.subcategoria,
         p.aplicacao, p.imagem_url, p.equivalencias, vp.origem, vp.confidence
    FROM public.veiculo_pecas vp
    JOIN public.pecas p ON p.id = vp.peca_id
   WHERE vp.veiculo_id = p_veiculo_id
   ORDER BY p.categoria NULLS LAST, p.descricao;
$$;

GRANT EXECUTE ON FUNCTION public.obter_pecas_do_veiculo(uuid) TO authenticated, service_role;

-- 6) DASHBOARD ADMIN: KPIs reais ampliados
DROP VIEW IF EXISTS public.admin_stats;
CREATE VIEW public.admin_stats WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM public.pecas) AS total_pecas,
  (SELECT count(*) FROM public.pecas WHERE imagem_url IS NOT NULL) AS pecas_com_imagem,
  (SELECT count(*) FROM public.pecas WHERE fonte_url IS NOT NULL) AS pecas_enriquecidas_ia,
  (SELECT count(*) FROM public.veiculos) AS total_veiculos,
  (SELECT count(*) FROM public.veiculo_pecas) AS total_relacionamentos,
  (SELECT count(*) FROM public.diagrama_catalogo) AS total_diagramas,
  (SELECT count(*) FROM public.diagrama_item) AS total_hotspots,
  (SELECT count(*) FROM public.busca_cache) AS total_cache,
  (SELECT coalesce(sum(hits), 0) FROM public.busca_cache) AS cache_hits,
  (SELECT count(*) FROM public.historico_buscas) AS total_buscas,
  (SELECT count(*) FROM public.historico_buscas WHERE resultado->>'origem' IN ('banco_interno', 'cache_supabase')) AS buscas_locais,
  (SELECT count(*) FROM public.historico_buscas WHERE resultado->>'origem' = 'pesquisa_inteligente') AS buscas_externas,
  (SELECT count(*) FROM public.orcamentos) AS total_orcamentos,
  (SELECT count(*) FROM public.historico_manutencao) AS total_historicos,
  CASE WHEN (SELECT count(*) FROM public.historico_buscas) > 0
    THEN round(100.0 * (SELECT count(*) FROM public.historico_buscas WHERE resultado->>'origem' IN ('banco_interno', 'cache_supabase'))
              / (SELECT count(*) FROM public.historico_buscas), 1)
    ELSE 0 END AS taxa_acerto_banco,
  (SELECT coalesce(sum(hits), 0) FROM public.busca_cache) AS economia_creditos;

GRANT SELECT ON public.admin_stats TO authenticated;