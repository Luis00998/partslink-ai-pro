-- Correção de problemas de segurança no Exploded Diagrams Infrastructure

-- 1. Adicionar search_path às funções para evitar Function Search Path Mutable
CREATE OR REPLACE FUNCTION public.set_diagrama_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END; $$;

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
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
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
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
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

CREATE OR REPLACE FUNCTION public.contar_oem_em_diagramas(
    p_codigo_oem text
)
RETURNS TABLE (
    total_diagramas integer,
    total_ocorrencias integer,
    lista_marcas text[],
    lista_modelos text[]
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
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