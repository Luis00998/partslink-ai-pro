CREATE EXTENSION IF NOT EXISTS unaccent;

-- normalizador imutável (para índices e busca)
CREATE OR REPLACE FUNCTION public.normalizar_texto(p_texto text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = public
AS $$ SELECT lower(trim(public.unaccent('public.unaccent'::regdictionary, coalesce(p_texto, '')))) $$;

-- ========== VEICULOS ==========
CREATE TABLE public.veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  placa text,
  vin text,
  chassis text,
  marca text NOT NULL,
  modelo text NOT NULL,
  ano integer,
  motor text,
  versao text,
  km_atual integer,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos TO authenticated;
GRANT ALL ON public.veiculos TO service_role;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages veiculos" ON public.veiculos FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_veiculos_updated BEFORE UPDATE ON public.veiculos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_veiculos_owner ON public.veiculos(owner_id);
CREATE UNIQUE INDEX idx_veiculos_owner_placa ON public.veiculos(owner_id, upper(placa)) WHERE placa IS NOT NULL;
CREATE INDEX idx_veiculos_vin ON public.veiculos(upper(vin)) WHERE vin IS NOT NULL;
CREATE INDEX idx_veiculos_marca_modelo ON public.veiculos(public.normalizar_texto(marca), public.normalizar_texto(modelo));

-- ========== ORCAMENTOS (reaproveita tabela existente) ==========
ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS veiculo_id uuid REFERENCES public.veiculos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valor_hora numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tempo_total_horas numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_pecas numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_servicos numeric(12,2) NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_orcamentos_owner ON public.orcamentos(owner_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_veiculo ON public.orcamentos(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_orcamento ON public.orcamento_itens(orcamento_id);

-- ========== SERVICOS PADRAO ==========
CREATE TABLE public.servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  nome text NOT NULL,
  categoria text,
  sistema_id uuid REFERENCES public.sistemas(id) ON DELETE SET NULL,
  descricao text,
  procedimentos text,
  tempo_desmontagem numeric(10,2) NOT NULL DEFAULT 0,
  tempo_montagem numeric(10,2) NOT NULL DEFAULT 0,
  tempo_total numeric(10,2) GENERATED ALWAYS AS (tempo_desmontagem + tempo_montagem) STORED,
  ferramentas_necessarias text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicos TO authenticated;
GRANT ALL ON public.servicos TO service_role;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read servicos" ON public.servicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage servicos" ON public.servicos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_servicos_updated BEFORE UPDATE ON public.servicos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_servicos_nome_trgm ON public.servicos USING gin (public.normalizar_texto(nome) gin_trgm_ops);

-- ========== CHECKLIST: PECAS SUGERIDAS POR SERVICO ==========
CREATE TABLE public.servico_pecas_sugeridas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id uuid NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  peca_id uuid REFERENCES public.pecas(id) ON DELETE SET NULL,
  codigo_oem text,
  descricao text NOT NULL,
  quantidade numeric(10,2) NOT NULL DEFAULT 1,
  obrigatorio boolean NOT NULL DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servico_pecas_sugeridas TO authenticated;
GRANT ALL ON public.servico_pecas_sugeridas TO service_role;
ALTER TABLE public.servico_pecas_sugeridas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read checklist" ON public.servico_pecas_sugeridas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage checklist" ON public.servico_pecas_sugeridas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_checklist_servico ON public.servico_pecas_sugeridas(servico_id);

-- ========== SERVICOS DENTRO DO ORCAMENTO ==========
CREATE TABLE public.orcamento_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  servico_id uuid REFERENCES public.servicos(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  tempo_horas numeric(10,2) NOT NULL DEFAULT 0,
  valor_hora numeric(12,2) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamento_servicos TO authenticated;
GRANT ALL ON public.orcamento_servicos TO service_role;
ALTER TABLE public.orcamento_servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages orcamento_servicos" ON public.orcamento_servicos FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX idx_orcamento_servicos_orcamento ON public.orcamento_servicos(orcamento_id);

-- ========== RECALCULO AUTOMATICO DE TOTAIS ==========
CREATE OR REPLACE FUNCTION public.recalcular_orcamento(p_orcamento_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pecas numeric(12,2); v_serv numeric(12,2); v_tempo numeric(10,2);
BEGIN
  SELECT coalesce(sum(quantidade * preco_unitario), 0) INTO v_pecas
    FROM public.orcamento_itens WHERE orcamento_id = p_orcamento_id;
  SELECT coalesce(sum(subtotal), 0), coalesce(sum(tempo_horas), 0) INTO v_serv, v_tempo
    FROM public.orcamento_servicos WHERE orcamento_id = p_orcamento_id;
  UPDATE public.orcamentos SET
    total_pecas = v_pecas,
    total_servicos = v_serv,
    tempo_total_horas = v_tempo,
    total = v_pecas + v_serv + mao_de_obra + frete - desconto,
    updated_at = now()
  WHERE id = p_orcamento_id;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recalcular_orcamento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalcular_orcamento(OLD.orcamento_id);
    RETURN OLD;
  END IF;
  IF NEW.subtotal IS NOT NULL AND TG_TABLE_NAME = 'orcamento_servicos' THEN
    NEW.subtotal := round(NEW.tempo_horas * NEW.valor_hora, 2);
  END IF;
  PERFORM public.recalcular_orcamento(NEW.orcamento_id);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_calcular_subtotal_servico()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.subtotal := round(coalesce(NEW.tempo_horas,0) * coalesce(NEW.valor_hora,0), 2);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_calcular_subtotal_item()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.subtotal := round(coalesce(NEW.quantidade,0) * coalesce(NEW.preco_unitario,0), 2);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_orcamento_servicos_subtotal BEFORE INSERT OR UPDATE ON public.orcamento_servicos
  FOR EACH ROW EXECUTE FUNCTION public.trg_calcular_subtotal_servico();
CREATE TRIGGER trg_orcamento_itens_subtotal BEFORE INSERT OR UPDATE ON public.orcamento_itens
  FOR EACH ROW EXECUTE FUNCTION public.trg_calcular_subtotal_item();
CREATE TRIGGER trg_orcamento_servicos_total AFTER INSERT OR UPDATE OR DELETE ON public.orcamento_servicos
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_orcamento();
CREATE TRIGGER trg_orcamento_itens_total AFTER INSERT OR UPDATE OR DELETE ON public.orcamento_itens
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_orcamento();

-- ========== HISTORICO DE MANUTENCAO ==========
CREATE TABLE public.historico_manutencao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  orcamento_id uuid REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  data_servico date NOT NULL DEFAULT current_date,
  km integer,
  descricao text NOT NULL,
  servicos_realizados text,
  observacoes text,
  valor_total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico_manutencao TO authenticated;
GRANT ALL ON public.historico_manutencao TO service_role;
ALTER TABLE public.historico_manutencao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages historico_manutencao" ON public.historico_manutencao FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_historico_manutencao_updated BEFORE UPDATE ON public.historico_manutencao
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_historico_manutencao_veiculo ON public.historico_manutencao(veiculo_id, data_servico DESC);

CREATE TABLE public.historico_manutencao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  historico_id uuid NOT NULL REFERENCES public.historico_manutencao(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  peca_id uuid REFERENCES public.pecas(id) ON DELETE SET NULL,
  codigo text,
  descricao text NOT NULL,
  quantidade numeric(10,2) NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico_manutencao_itens TO authenticated;
GRANT ALL ON public.historico_manutencao_itens TO service_role;
ALTER TABLE public.historico_manutencao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages historico_manutencao_itens" ON public.historico_manutencao_itens FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX idx_historico_itens_historico ON public.historico_manutencao_itens(historico_id);

-- ========== CACHE DE PESQUISAS EXTERNAS ==========
CREATE TABLE public.busca_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  termo_normalizado text NOT NULL UNIQUE,
  termo_original text NOT NULL,
  tipo text NOT NULL DEFAULT 'smart',
  resultado jsonb NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.busca_cache TO authenticated;
GRANT ALL ON public.busca_cache TO service_role;
ALTER TABLE public.busca_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read cache" ON public.busca_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write cache" ON public.busca_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update cache" ON public.busca_cache FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_busca_cache_updated BEFORE UPDATE ON public.busca_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_busca_cache_expires ON public.busca_cache(expires_at);

-- ========== INDICES DE PESQUISA NO CATALOGO ==========
CREATE INDEX idx_pecas_oem_trgm ON public.pecas USING gin (public.normalizar_texto(codigo_original) gin_trgm_ops);
CREATE INDEX idx_pecas_desc_norm_trgm ON public.pecas USING gin (public.normalizar_texto(descricao) gin_trgm_ops);
CREATE INDEX idx_pecas_marca_trgm ON public.pecas USING gin (public.normalizar_texto(marca) gin_trgm_ops);
CREATE INDEX idx_pecas_fabricante_trgm ON public.pecas USING gin (public.normalizar_texto(fabricante) gin_trgm_ops);
CREATE INDEX idx_pecas_aplicacao_trgm ON public.pecas USING gin (public.normalizar_texto(aplicacao) gin_trgm_ops);
CREATE INDEX idx_pecas_motores_trgm ON public.pecas USING gin (public.normalizar_texto(motores_compativeis) gin_trgm_ops);
CREATE INDEX idx_pecas_chassis_trgm ON public.pecas USING gin (public.normalizar_texto(chassis_compativeis) gin_trgm_ops);
CREATE INDEX idx_pecas_owner ON public.pecas(owner_id);

-- ========== PESQUISA UNIFICADA (fuzzy, sem acento, palavras fora de ordem) ==========
CREATE OR REPLACE FUNCTION public.buscar_pecas_unificado(p_termo text, p_limite integer DEFAULT 30)
RETURNS TABLE(
  id uuid, codigo_original text, codigo_interno text, codigo_paralelo text,
  descricao text, marca text, fabricante text, categoria text, subcategoria text,
  aplicacao text, motores_compativeis text, chassis_compativeis text,
  imagem_url text, equivalencias jsonb, score real
) LANGUAGE sql STABLE SET search_path = public AS $$
  WITH q AS (
    SELECT public.normalizar_texto(p_termo) AS t,
           string_to_array(public.normalizar_texto(p_termo), ' ') AS palavras
  ), base AS (
    SELECT p.*,
      GREATEST(
        CASE WHEN public.normalizar_texto(p.codigo_original) = q.t THEN 3.0
             WHEN public.normalizar_texto(p.codigo_original) LIKE '%' || q.t || '%' THEN 2.0 ELSE 0 END,
        CASE WHEN public.normalizar_texto(p.codigo_interno) = q.t THEN 2.8
             WHEN public.normalizar_texto(p.codigo_interno) LIKE '%' || q.t || '%' THEN 1.8 ELSE 0 END,
        CASE WHEN public.normalizar_texto(p.codigo_paralelo) LIKE '%' || q.t || '%' THEN 1.7 ELSE 0 END,
        similarity(public.normalizar_texto(p.descricao), q.t),
        similarity(public.normalizar_texto(coalesce(p.marca,'') || ' ' || coalesce(p.fabricante,'')), q.t) * 0.8,
        similarity(public.normalizar_texto(coalesce(p.aplicacao,'')), q.t) * 0.8,
        similarity(public.normalizar_texto(coalesce(p.motores_compativeis,'')), q.t) * 0.7,
        similarity(public.normalizar_texto(coalesce(p.chassis_compativeis,'')), q.t) * 0.7,
        similarity(public.normalizar_texto(coalesce(p.categoria,'') || ' ' || coalesce(p.subcategoria,'')), q.t) * 0.6,
        CASE WHEN (
          SELECT bool_and(
            public.normalizar_texto(
              coalesce(p.descricao,'') || ' ' || coalesce(p.marca,'') || ' ' || coalesce(p.fabricante,'') || ' ' ||
              coalesce(p.categoria,'') || ' ' || coalesce(p.subcategoria,'') || ' ' || coalesce(p.aplicacao,'') || ' ' ||
              coalesce(p.motores_compativeis,'') || ' ' || coalesce(p.chassis_compativeis,'') || ' ' ||
              coalesce(p.codigo_original,'') || ' ' || coalesce(p.codigo_interno,'') || ' ' || coalesce(p.codigo_paralelo,'')
            ) LIKE '%' || w || '%')
          FROM unnest(q.palavras) AS w WHERE length(w) > 1
        ) THEN 1.5 ELSE 0 END
      )::real AS score
    FROM public.pecas p, q
  )
  SELECT b.id, b.codigo_original, b.codigo_interno, b.codigo_paralelo,
         b.descricao, b.marca, b.fabricante, b.categoria, b.subcategoria,
         b.aplicacao, b.motores_compativeis, b.chassis_compativeis,
         b.imagem_url, b.equivalencias, b.score
  FROM base b
  WHERE b.score >= 0.18
  ORDER BY b.score DESC, b.descricao
  LIMIT GREATEST(p_limite, 1);
$$;

-- ========== DIAGRAMAS DE UMA PECA (relacao inversa) ==========
CREATE OR REPLACE FUNCTION public.obter_diagramas_da_peca(p_peca_id uuid)
RETURNS TABLE(diagrama_id uuid, nome_diagrama text, sistema_nome text, imagem_url text,
              marca_veiculo text, modelo_veiculo text, ano_veiculo integer,
              numero_referencia integer, quantidade integer)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT dc.id, dc.nome_diagrama, s.nome, dc.imagem_url,
         dc.marca_veiculo, dc.modelo_veiculo, dc.ano_veiculo,
         di.numero_referencia, di.quantidade
  FROM public.diagrama_item di
  JOIN public.diagrama_catalogo dc ON dc.id = di.diagrama_id
  LEFT JOIN public.sistemas s ON s.id = dc.sistema_id
  WHERE di.peca_id = p_peca_id AND dc.ativo = true
  ORDER BY dc.marca_veiculo, dc.modelo_veiculo, di.numero_referencia;
$$;