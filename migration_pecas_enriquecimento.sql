-- Adicionar novas colunas à tabela pecas para suporte a enriquecimento e diagramas
ALTER TABLE public.pecas 
ADD COLUMN IF NOT EXISTS codigo_paralelo text,
ADD COLUMN IF NOT EXISTS marca text,
ADD COLUMN IF NOT EXISTS motores_compativeis text,
ADD COLUMN IF NOT EXISTS chassis_compativeis text,
ADD COLUMN IF NOT EXISTS ano_inicial integer,
ADD COLUMN IF NOT EXISTS ano_final integer,
ADD COLUMN IF NOT EXISTS equivalencias jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS fonte_nome text,
ADD COLUMN IF NOT EXISTS imagens_adicionais jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ficha_tecnica jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS torque text,
ADD COLUMN IF NOT EXISTS quantidade_por_veiculo text,
ADD COLUMN IF NOT EXISTS tipo_oleo text,
ADD COLUMN IF NOT EXISTS quantidade_oleo text,
ADD COLUMN IF NOT EXISTS liquido_arrefecimento text,
ADD COLUMN IF NOT EXISTS ferramentas_necessarias text,
ADD COLUMN IF NOT EXISTS tempo_estimado text,
ADD COLUMN IF NOT EXISTS procedimentos_tecnicos text,
ADD COLUMN IF NOT EXISTS etiquetas text[] DEFAULT '{}'::text[];

-- Criar tabela de diagramas
CREATE TABLE IF NOT EXISTS public.diagramas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    descricao text,
    imagem_url text NOT NULL,
    veiculo_id uuid, -- Opcional, se houver tabela de veículos específica
    modelo_veiculo text,
    sistema text, -- Motor, Freios, etc.
    owner_id uuid REFERENCES auth.users(id) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagramas TO authenticated;
GRANT ALL ON public.diagramas TO service_role;
ALTER TABLE public.diagramas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see all diagrams" ON public.diagramas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage diagrams" ON public.diagramas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Criar tabela de itens do diagrama (hotspots)
CREATE TABLE IF NOT EXISTS public.diagramas_itens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    diagrama_id uuid REFERENCES public.diagramas(id) ON DELETE CASCADE NOT NULL,
    peca_id uuid REFERENCES public.pecas(id) ON DELETE SET NULL,
    posicao_x float NOT NULL,
    posicao_y float NOT NULL,
    numero_referencia integer, -- Número no desenho
    codigo_oem_referencia text,
    descricao_referencia text,
    quantidade_referencia integer DEFAULT 1,
    created_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagramas_itens TO authenticated;
GRANT ALL ON public.diagramas_itens TO service_role;
ALTER TABLE public.diagramas_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see all diagram items" ON public.diagramas_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage diagram items" ON public.diagramas_itens FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Criar tabela de favoritos
CREATE TABLE IF NOT EXISTS public.favoritos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    peca_id uuid REFERENCES public.pecas(id) ON DELETE CASCADE NOT NULL,
    lista_nome text DEFAULT 'Geral',
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user_id, peca_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favoritos TO authenticated;
GRANT ALL ON public.favoritos TO service_role;
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorites" ON public.favoritos FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Adicionar índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_pecas_codigo_original ON public.pecas (codigo_original);
CREATE INDEX IF NOT EXISTS idx_pecas_codigo_interno ON public.pecas (codigo_interno);
CREATE INDEX IF NOT EXISTS idx_pecas_codigo_paralelo ON public.pecas (codigo_paralelo);
CREATE INDEX IF NOT EXISTS idx_pecas_descricao_trgm ON public.pecas USING gin (descricao gin_trgm_ops);
