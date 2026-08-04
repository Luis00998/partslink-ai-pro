import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { SmartCandidate } from "./smart-search.types";

type Client = SupabaseClient<Database>;

/**
 * UPSERT de um candidato no catálogo, priorizando o código OEM e caindo
 * para o código interno. Usado tanto pelo botão "Adicionar ao Catálogo"
 * quanto pela persistência automática da Pesquisa Inteligente.
 */
export async function upsertPecaFromCandidate(supabase: Client, userId: string, c: SmartCandidate) {
  let existingId: string | null = null;

  if (c.codigo_original) {
    const { data } = await supabase
      .from("pecas")
      .select("id")
      .eq("codigo_original", c.codigo_original)
      .limit(1)
      .maybeSingle();
    if (data) existingId = data.id;
  }

  if (!existingId && c.codigo_interno) {
    const { data } = await supabase
      .from("pecas")
      .select("id")
      .eq("codigo_interno", c.codigo_interno)
      .limit(1)
      .maybeSingle();
    if (data) existingId = data.id;
  }

  const payload = {
    owner_id: userId,
    codigo_original: c.codigo_original ?? null,
    codigo_interno: c.codigo_interno ?? null,
    codigo_paralelo: c.codigo_paralelo ?? null,
    descricao: c.descricao,
    marca: c.marca ?? null,
    fabricante: c.fabricante ?? null,
    categoria: c.categoria ?? null,
    subcategoria: c.subcategoria ?? null,
    aplicacao: c.aplicacao ?? null,
    motores_compativeis: c.motores_compativeis ?? null,
    chassis_compativeis: c.chassis_compativeis ?? null,
    ano_inicial: c.ano_inicial ?? null,
    ano_final: c.ano_final ?? null,
    observacoes: c.observacoes ?? null,
    equivalencias: (c.equivalencias ?? []) as never,
    fonte_url: c.fonte_url,
    fonte_nome: c.fonte_nome ?? null,
    fonte_confianca: c.fonte_confianca,
    torque: c.torque ?? null,
    quantidade_por_veiculo: c.quantidade_por_veiculo ?? null,
    tipo_oleo: c.tipo_oleo ?? null,
    quantidade_oleo: c.quantidade_oleo ?? null,
    liquido_arrefecimento: c.liquido_arrefecimento ?? null,
    ferramentas_necessarias: c.ferramentas_necessarias ?? null,
    tempo_estimado: c.tempo_estimado ?? null,
    procedimentos_tecnicos: c.procedimentos_tecnicos ?? null,
    imagem_url: c.imagem_url ?? null,
    importado_por: userId,
    importado_em: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existingId) {
    const { error } = await supabase.from("pecas").update(payload).eq("id", existingId);
    if (error) throw new Error(error.message);
    return { id: existingId, status: "updated" as const };
  }

  const { data: inserted, error } = await supabase.from("pecas").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return { id: inserted.id, status: "created" as const };
}

/** Persiste automaticamente candidatos confiáveis (banco cresce, IA é menos usada). */
export async function persistirCandidatosConfiaveis(supabase: Client, userId: string, candidatos: SmartCandidate[]) {
  const confiaveis = candidatos.filter(
    (c) => c.fonte_confianca === "alta" && (c.codigo_original || c.codigo_interno),
  );
  let salvos = 0;
  for (const candidato of confiaveis) {
    try {
      await upsertPecaFromCandidate(supabase, userId, candidato);
      salvos += 1;
    } catch (e) {
      console.error(`[SmartSearch][AutoSave] falha: ${(e as Error).message}`);
    }
  }
  if (salvos > 0) console.log(`[SmartSearch][AutoSave] persistidos=${salvos}`);
  return salvos;
}
