import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { SmartSearchResult } from "./smart-search.types";

type Client = SupabaseClient<Database>;

export type UnifiedPart = Database["public"]["Functions"]["buscar_pecas_unificado"]["Returns"][number];

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
export async function buscarPecasNoBanco(supabase: Client, termo: string, limite = 30): Promise<UnifiedPart[]> {
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
export async function lerCacheBusca(supabase: Client, termo: string): Promise<SmartSearchResult | null> {
  const chave = normalizarTermo(termo);
  const { data, error } = await supabase
    .from("busca_cache")
    .select("id, resultado, hits, expires_at")
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
    .update({ hits: (data.hits ?? 0) + 1 })
    .eq("id", data.id);

  console.log(`[Catalogo][Cache] HIT termo="${chave}" hits=${(data.hits ?? 0) + 1}`);
  return data.resultado as unknown as SmartSearchResult;
}

/** Grava (ou atualiza) o resultado de uma pesquisa externa no cache. */
export async function gravarCacheBusca(
  supabase: Client,
  termo: string,
  resultado: SmartSearchResult,
  tipo = "smart",
) {
  const chave = normalizarTermo(termo);
  const { error } = await supabase.from("busca_cache").upsert(
    {
      termo_normalizado: chave,
      termo_original: termo,
      tipo,
      resultado: resultado as never,
      hits: 0,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "termo_normalizado" },
  );

  if (error) console.error(`[Catalogo][Cache] erro gravação termo="${chave}": ${error.message}`);
  else console.log(`[Catalogo][Cache] gravado termo="${chave}" candidatos=${resultado.candidatos.length}`);
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
  if (error) console.error(`[Catalogo][Histórico] falha (${tipo}) termo="${termo}": ${error.message}`);
}
