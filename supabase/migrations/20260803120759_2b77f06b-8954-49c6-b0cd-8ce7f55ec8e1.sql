-- ============================================================================
-- EXPLODED DIAGRAMS INFRASTRUCTURE
-- Sistema completo de diagramas explodidos com relacionamentos, RLS e índices
-- ============================================================================

-- 1. SISTEMAS (categorias de diagramas)
CREATE TABLE IF NOT EXISTS public.sistemas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL UNIQUE,
    ordem integer DEFAULT 0,
    descricao text,
    icone text,
    created_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT ON public.sistemas TO authenticated, anon;
GRANT ALL ON public.sistemas TO service_role;

-- Inserir sistemas padrão
INSERT INTO public.sistemas (nome, ordem, descricao) VALUES
    ('Motor', 1, 'Motor e componentes internos'),
    ('Cabeçote', 2, 'Cabeçote e válvulas'),
    ('Lubrificação', 3, 'Sistema de lubrificação'),
    ('Arrefecimento', 4, 'Sistema de arrefecimento'),
    ('Alimentação', 5, 'Sistema de alimentação de combustível'),
    ('Admissão', 6, 'Sistema de admissão'),
    ('Escape', 7, 'Sistema de escape'),
    ('Embreagem', 8, 'Sistema de embreagem'),
    ('Câmbio', 9, 'Caixa de câmbio'),
    ('Diferencial', 10, 'Diferencial'),
    ('Suspensão Dianteira', 11, 'Suspensão dianteira'),
    ('Suspensão Traseira', 12, 'Suspensão traseira'),
    ('Direção', 13, 'Sistema de direção'),
    ('Freios', 14, 'Sistema de freios'),
    ('Sistema Pneumático', 15, 'Sistema pneumático'),
    ('Sistema Elétrico', 16, 'Sistema elétrico'),
    ('Cabine', 17, 'Cabine do condutor'),
    ('Chassi', 18, 'Estrutura do chassi'),
    ('Eixos', 19, 'Eixos e rodas'),
    ('Rodas', 20, 'Rodas e pneus'),
    ('Tanques', 21, 'Tanques e reservatórios'),
    ('Ar-Condicionado', 22, 'Sistema de ar-condicionado'),
    ('Acessórios', 23, 'Acessórios diversos')
ON CONFLICT DO NOTHING;

-- 2. CATÁLOGO DE DIAGRAMAS (metadados, sem a imagem em si)
CREATE TABLE IF NOT EXISTS public.diagrama_catalogo (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Identificação do veículo
    marca_veiculo text NOT NULL,
    modelo_veiculo text NOT NULL,
    ano_veiculo integer,
    motor_veiculo text,
    versao_veiculo text,
    chassis_veiculo text,
    vin_veiculo text,
    
    -- Identificação do diagrama
    sistema_id uuid NOT NULL REFERENCES public.sistemas(id) ON DELETE RESTRICT,
    nome_diagrama text NOT NULL,
    descricao text,
    
    -- Armazenamento da imagem
    imagem_url text NOT NULL,
    imagem_bucket text DEFAULT 'diagramas-imagens',
    imagem_path text,
    imagem_tamanho integer,
    imagem_tipo text,
    
    -- Metadados
    total_itens integer DEFAULT 0,
    total_pecas_unicas integer DEFAULT 0,
    ativo boolean DEFAULT true,
    importado_em timestamptz DEFAULT now(),
    ultima_atualizacao timestamptz DEFAULT now(),
    
    -- Rastreabilidade
    owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    origem_import text,
    fonte_url text,
    hash_imagem text,
    
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    
    UNIQUE(marca_veiculo, modelo_veiculo, ano_veiculo, sistema_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagrama_catalogo TO authenticated;
GRANT ALL ON public.diagrama_catalogo TO service_role;
ALTER TABLE public.diagrama_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all diagrams" ON public.diagrama_catalogo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage diagrams" ON public.diagrama_catalogo FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. ITENS DO DIAGRAMA (peças e suas posições)
CREATE TABLE IF NOT EXISTS public.diagrama_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    diagrama_id uuid NOT NULL REFERENCES public.diagrama_catalogo(id) ON DELETE CASCADE,
    
    -- Referência interna
    peca_id uuid REFERENCES public.pecas(id) ON DELETE SET NULL,
    
    -- Dados do desenho
    numero_referencia integer NOT NULL,
    posicao_x float NOT NULL,
    posicao_y float NOT NULL,
    raio_hotspot float DEFAULT 20,
    
    -- Dados da peça conforme o diagrama
    codigo_oem_diagrama text,
    codigo_interno_diagrama text,
    descricao_diagrama text NOT NULL,
    marca_diagrama text,
    fabricante_diagrama text,
    
    -- Aplicabilidade
    quantidade integer NOT NULL DEFAULT 1,
    unidade text DEFAULT 'unidade',
    aplicacoes text,
    motores_aplicaveis text,
    chassis_aplicaveis text,
    
    -- Informações técnicas
    observacoes text,
    posicao_montagem text,
    
    -- Rastreabilidade
    criado_em timestamptz DEFAULT now() NOT NULL,
    atualizado_em timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagrama_item TO authenticated;
GRANT ALL ON public.diagrama_item TO service_role;
ALTER TABLE public.diagrama_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all diagram items" ON public.diagrama_item FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage diagram items" ON public.diagrama_item FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. MAPEAMENTO AUTOMÁTICO (relaciona OEM do diagrama com peças do banco)
CREATE TABLE IF NOT EXISTS public.diagrama_mapeamento_oem (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    diagrama_id uuid NOT NULL REFERENCES public.diagrama_catalogo(id) ON DELETE CASCADE,
    item_numero integer NOT NULL,
    
    codigo_oem_diagrama text NOT NULL,
    codigo_oem_banco text NOT NULL,
    
    peca_id uuid REFERENCES public.pecas(id) ON DELETE SET NULL,
    
    mapeado_automaticamente boolean DEFAULT true,
    mapeado_em timestamptz DEFAULT now(),
    mapeado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    
    confianca float DEFAULT 1.0,
    
    created_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagrama_mapeamento_oem TO authenticated;
GRANT ALL ON public.diagrama_mapeamento_oem TO service_role;
ALTER TABLE public.diagrama_mapeamento_oem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mappings" ON public.diagrama_mapeamento_oem FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage mappings" ON public.diagrama_mapeamento_oem FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. HISTÓRICO DE DIAGRAMAS (auditoria)
CREATE TABLE IF NOT EXISTS public.diagrama_historico (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    diagrama_id uuid NOT NULL REFERENCES public.diagrama_catalogo(id) ON DELETE CASCADE,
    
    tipo_alteracao text NOT NULL,
    descricao text,
    dados_anteriores jsonb,
    dados_novos jsonb,
    
    usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_em timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE ON public.diagrama_historico TO authenticated;
GRANT ALL ON public.diagrama_historico TO service_role;
ALTER TABLE public.diagrama_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit history" ON public.diagrama_historico FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_diagrama_catalogo_veiculo 
    ON public.diagrama_catalogo (marca_veiculo, modelo_veiculo, ano_veiculo);

CREATE INDEX IF NOT EXISTS idx_diagrama_catalogo_motor 
    ON public.diagrama_catalogo (motor_veiculo) WHERE motor_veiculo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_diagrama_catalogo_sistema 
    ON public.diagrama_catalogo (sistema_id);

CREATE INDEX IF NOT EXISTS idx_diagrama_item_peca 
    ON public.diagrama_item (peca_id);

CREATE INDEX IF NOT EXISTS idx_diagrama_item_diagrama 
    ON public.diagrama_item (diagrama_id, numero_referencia);

CREATE INDEX IF NOT EXISTS idx_diagrama_item_codigo_oem 
    ON public.diagrama_item (codigo_oem_diagrama);

CREATE INDEX IF NOT EXISTS idx_diagrama_mapeamento_oem_codigo 
    ON public.diagrama_mapeamento_oem (codigo_oem_diagrama, codigo_oem_banco);

CREATE INDEX IF NOT EXISTS idx_diagrama_mapeamento_peca 
    ON public.diagrama_mapeamento_oem (peca_id);

CREATE INDEX IF NOT EXISTS idx_diagrama_catalogo_ativo 
    ON public.diagrama_catalogo (ativo) WHERE ativo = true;

-- ============================================================================
-- FUNÇÕES AUXILIARES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_diagrama_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END; $$;

CREATE TRIGGER trg_diagrama_catalogo_updated BEFORE UPDATE ON public.diagrama_catalogo FOR EACH ROW EXECUTE FUNCTION public.set_diagrama_updated_at();
CREATE TRIGGER trg_diagrama_item_updated BEFORE UPDATE ON public.diagrama_item FOR EACH ROW EXECUTE FUNCTION public.set_diagrama_updated_at();

-- Função para buscar diagramas por veículo
CREATE OR REPLACE FUNCTION public.buscar_diagramas_veiculo(
    p_marca text,
    p_modelo text,
    p_ano integer DEFAULT NULL,
    p_motor text DEFAULT NULL
)
RETURNS TABLE (
    diagrama_id uuid,
    sistema_nome text,
    nome_diagrama text,
    imagem_url text,
    total_itens integer,
    marca_veiculo text,
    modelo_veiculo text,
    ano_veiculo integer,
    motor_veiculo text
) LANGUAGE sql STABLE AS $$
    SELECT 
        dc.id,
        s.nome,
        dc.nome_diagrama,
        dc.imagem_url,
        dc.total_itens,
        dc.marca_veiculo,
        dc.modelo_veiculo,
        dc.ano_veiculo,
        dc.motor_veiculo
    FROM public.diagrama_catalogo dc
    JOIN public.sistemas s ON dc.sistema_id = s.id
    WHERE LOWER(dc.marca_veiculo) = LOWER(p_marca)
        AND LOWER(dc.modelo_veiculo) = LOWER(p_modelo)
        AND (p_ano IS NULL OR dc.ano_veiculo = p_ano)
        AND (p_motor IS NULL OR LOWER(dc.motor_veiculo) = LOWER(p_motor))
        AND dc.ativo = true
    ORDER BY s.ordem;
$$;

-- Função para obter itens do diagrama com peças
CREATE OR REPLACE FUNCTION public.obter_itens_diagrama_com_pecas(
    p_diagrama_id uuid
)
RETURNS TABLE (
    numero_referencia integer,
    descricao_diagrama text,
    codigo_oem_diagrama text,
    marca_diagrama text,
    fabricante_diagrama text,
    quantidade integer,
    posicao_x float,
    posicao_y float,
    raio_hotspot float,
    peca_id uuid,
    codigo_original text,
    codigo_interno text,
    descricao_peca text,
    marca_peca text,
    equivalencias jsonb
) LANGUAGE sql STABLE AS $$
    SELECT 
        di.numero_referencia,
        di.descricao_diagrama,
        di.codigo_oem_diagrama,
        di.marca_diagrama,
        di.fabricante_diagrama,
        di.quantidade,
        di.posicao_x,
        di.posicao_y,
        di.raio_hotspot,
        p.id,
        p.codigo_original,
        p.codigo_interno,
        p.descricao,
        p.marca,
        p.equivalencias
    FROM public.diagrama_item di
    LEFT JOIN public.pecas p ON di.peca_id = p.id
    WHERE di.diagrama_id = p_diagrama_id
    ORDER BY di.numero_referencia;
$$;

-- Função para contar OEM em diagramas
CREATE OR REPLACE FUNCTION public.contar_oem_em_diagramas(
    p_codigo_oem text
)
RETURNS TABLE (
    total_diagramas integer,
    total_ocorrencias integer,
    lista_marcas text[],
    lista_modelos text[]
) LANGUAGE sql STABLE AS $$
    SELECT 
        COUNT(DISTINCT dc.id)::integer as total_diagramas,
        COUNT(di.id)::integer as total_ocorrencias,
        ARRAY_AGG(DISTINCT dc.marca_veiculo) as lista_marcas,
        ARRAY_AGG(DISTINCT dc.modelo_veiculo) as lista_modelos
    FROM public.diagrama_item di
    JOIN public.diagrama_catalogo dc ON di.diagrama_id = dc.id
    WHERE di.codigo_oem_diagrama = p_codigo_oem
        OR di.codigo_oem_diagrama ILIKE '%' || p_codigo_oem || '%';
$$;

-- ============================================================================
-- ATUALIZAR TABELA PECAS COM COLUNAS PARA DIAGRAMA
-- ============================================================================

ALTER TABLE public.pecas
ADD COLUMN IF NOT EXISTS usado_em_diagramas boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS total_diagramas integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultima_consulta_diagrama timestamptz;

CREATE INDEX IF NOT EXISTS idx_pecas_usado_em_diagramas 
    ON public.pecas (usado_em_diagramas) WHERE usado_em_diagramas = true;