import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { SmartSearchResult } from "./smart-search.types";

type Client = SupabaseClient<Database>;

export type UnifiedPart =
  Database["public"]["Functions"]["buscar_pecas_unificado"]["Returns"][number];

/** Normaliza o termo do mesmo modo que a função SQL public.normalizar_texto. */
export function normalizarTermo(termo: string) {
  return termo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pesquisa unificada no catálogo (Supabase primeiro).
 * Tolera acentos, caixa alta, palavras fora de ordem e erros de digitação.
 */
export async function buscarPecasNoBanco(
  supabase: Client,
  termo: string,
  limite = 30,
): Promise<UnifiedPart[]> {
  const { data, error } = await supabase.rpc("buscar_pecas_unificado", {
    p_termo: termo,
    p_limite: limite,
  });

  if (error) {
    console.error(`[Catalogo][Busca] erro RPC termo="${termo}": ${error.message}`);
    return [];
  }

  const rows = (data ?? []) as UnifiedPart[];
  console.log(`[Catalogo][Busca] termo="${termo}" resultados=${rows.length}`);
  return rows;
}

/** Lê o cache de pesquisas externas; devolve null quando ausente ou expirado. */
export async function lerCacheBusca(
  supabase: Client,
  termo: string,
): Promise<SmartSearchResult | null> {
  const chave = normalizarTermo(termo);
  const { data, error } = await supabase
    .from("busca_cache")
    .select("id, resultado, hits, cache_hit, expires_at")
    .eq("termo_normalizado", chave)
    .maybeSingle();

  if (error) {
    console.error(`[Catalogo][Cache] erro leitura termo="${chave}": ${error.message}`);
    return null;
  }
  if (!data) return null;

  if (new Date(data.expires_at).getTime() < Date.now()) {
    console.log(`[Catalogo][Cache] expirado termo="${chave}"`);
    return null;
  }

  await supabase
    .from("busca_cache")
    .update({ hits: (data.hits ?? 0) + 1, cache_hit: (data.cache_hit ?? 0) + 1 })
    .eq("id", data.id);

  console.log(`[Catalogo][Cache] HIT termo="${chave}" hits=${(data.hits ?? 0) + 1}`);
  return data.resultado as unknown as SmartSearchResult;
}

/** TTL padrão do cache (dias) — configurável por env, sem tocar no frontend. */
const CACHE_TTL_DIAS = Number(process.env.BUSCA_CACHE_TTL_DIAS ?? 30) || 30;

/** Grava (ou atualiza) o resultado de uma pesquisa externa no cache. */
export async function gravarCacheBusca(
  supabase: Client,
  termo: string,
  resultado: SmartSearchResult,
  tipo = "smart",
) {
  const chave = normalizarTermo(termo);
  const confiancas = resultado.candidatos.map((c) => c.fonte_confianca);
  const confianca = confiancas.includes("alta")
    ? "alta"
    : confiancas.includes("media")
      ? "media"
      : "baixa";

  const { error } = await supabase.from("busca_cache").upsert(
    {
      termo_normalizado: chave,
      termo_original: termo,
      tipo,
      resultado: resultado as never,
      payload: resultado as never,
      fonte:
        resultado.fontes_consultadas
          .map((f) => f.url)
          .join(" | ")
          .slice(0, 2000) || null,
      confianca,
      hits: 0,
      expires_at: new Date(Date.now() + CACHE_TTL_DIAS * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "termo_normalizado" },
  );

  if (error) console.error(`[Catalogo][Cache] erro gravação termo="${chave}": ${error.message}`);
  else
    console.log(
      `[Catalogo][Cache] gravado termo="${chave}" candidatos=${resultado.candidatos.length}`,
    );
}

/** Registra a busca no histórico do usuário (helper único, evita duplicidade). */
export async function registrarHistorico(
  supabase: Client,
  userId: string,
  tipo: string,
  termo: string,
  resultado: Record<string, unknown>,
) {
  const { error } = await supabase.from("historico_buscas").insert({
    tipo,
    termo,
    resultado: resultado as never,
    owner_id: userId,
  });
  if (error)
    console.error(`[Catalogo][Histórico] falha (${tipo}) termo="${termo}": ${error.message}`);
}

/** Extrai códigos citados no campo jsonb `equivalencias` de uma peça. */
function codigosEquivalentes(equivalencias: unknown): string[] {
  if (!Array.isArray(equivalencias)) return [];
  const out: string[] = [];
  for (const item of equivalencias) {
    if (typeof item === "string") out.push(item);
    else if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      for (const key of ["codigo", "code", "codigo_original", "oem", "referencia"]) {
        if (typeof obj[key] === "string") out.push(obj[key] as string);
      }
    }
  }
  return [...new Set(out.map((c) => c.trim()).filter((c) => c.length > 1))];
}

/**
 * Relacionamentos automáticos de uma peça — reutiliza apenas tabelas existentes:
 * equivalentes, irmãs (mesma categoria), peças do mesmo sistema (via diagramas),
 * veículos compatíveis, diagramas onde aparece, orçamentos e histórico de manutenção.
 */
export async function obterRelacionamentos(supabase: Client, pecaId: string) {
  const { data: base, error } = await supabase
    .from("pecas")
    .select("*")
    .eq("id", pecaId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!base) throw new Error("Peça não encontrada");

  const codigos = [
    ...new Set(
      [
        base.codigo_original,
        base.codigo_interno,
        base.codigo_paralelo,
        ...codigosEquivalentes(base.equivalencias),
      ]
        .filter((c): c is string => typeof c === "string" && c.trim().length > 1)
        .map((c) => c.trim()),
    ),
  ];

  const orFilter = codigos
    .map((c) => `codigo_original.eq.${c},codigo_interno.eq.${c},codigo_paralelo.eq.${c}`)
    .join(",");

  const [equivalentes, irmas, diagramas, orcamentos, historico] = await Promise.all([
    orFilter
      ? supabase
          .from("pecas")
          .select(
            "id, codigo_original, codigo_interno, codigo_paralelo, descricao, marca, fabricante, imagem_url",
          )
          .or(orFilter)
          .neq("id", pecaId)
          .limit(30)
      : Promise.resolve({ data: [], error: null }),
    base.categoria
      ? supabase
          .from("pecas")
          .select("id, codigo_original, descricao, marca, fabricante, subcategoria, imagem_url")
          .eq("categoria", base.categoria)
          .neq("id", pecaId)
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
    supabase.rpc("obter_diagramas_da_peca", { p_peca_id: pecaId }),
    supabase
      .from("orcamento_itens")
      .select(
        "id, quantidade, preco_unitario, created_at, orcamentos(id, numero, status, created_at)",
      )
      .eq("peca_id", pecaId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("historico_manutencao_itens")
      .select(
        "id, quantidade, descricao, historico_manutencao(id, data_servico, km, descricao, veiculo_id)",
      )
      .eq("peca_id", pecaId)
      .limit(20),
  ]);

  const diagramaRows = (diagramas.data ?? []) as Array<{
    diagrama_id: string;
    nome_diagrama: string;
    sistema_nome: string | null;
    marca_veiculo: string;
    modelo_veiculo: string;
    ano_veiculo: number | null;
  }>;

  // peças utilizadas nos mesmos diagramas (mesmo sistema mecânico)
  let mesmoSistema: Array<{
    numero_referencia: number;
    descricao_diagrama: string;
    codigo_oem_diagrama: string | null;
    peca_id: string | null;
    diagrama_id: string;
  }> = [];
  if (diagramaRows.length > 0) {
    const { data } = await supabase
      .from("diagrama_item")
      .select("numero_referencia, descricao_diagrama, codigo_oem_diagrama, peca_id, diagrama_id")
      .in(
        "diagrama_id",
        diagramaRows.map((d) => d.diagrama_id),
      )
      .neq("peca_id", pecaId)
      .limit(60);
    mesmoSistema = data ?? [];
  }

  const veiculosCompatíveis = [
    ...new Map(
      diagramaRows.map((d) => [
        `${d.marca_veiculo}|${d.modelo_veiculo}|${d.ano_veiculo ?? ""}`,
        { marca: d.marca_veiculo, modelo: d.modelo_veiculo, ano: d.ano_veiculo },
      ]),
    ).values(),
  ];

  return {
    peca: base,
    codigos_relacionados: codigos,
    equivalentes: equivalentes.data ?? [],
    irmas: irmas.data ?? [],
    mesmo_sistema: mesmoSistema,
    veiculos_compativeis: veiculosCompatíveis,
    diagramas: diagramaRows,
    orcamentos: orcamentos.data ?? [],
    historico_manutencao: historico.data ?? [],
  };
}
