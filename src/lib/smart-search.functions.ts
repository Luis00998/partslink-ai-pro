import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SaveInput, SearchInput } from "./smart-search.schemas";
import { performSmartSearch } from "./smart-search.server";
import type { SmartSearchResult } from "./smart-search.types";

export type { SmartCandidate, SmartSearchResult } from "./smart-search.types";

export const smartSearchPart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SearchInput.parse(d))
  .handler(async ({ data, context }): Promise<SmartSearchResult> => {
    console.log(`[SmartSearch] handler start user=${context.userId} termo="${data.termo}" tipo=${data.tipo}`);
    const result = await performSmartSearch(data.termo);

    // registrar no histórico
    await context.supabase.from("historico_buscas").insert({
      tipo: "smart",
      termo: data.termo,
      resultado: {
        origem: "pesquisa_inteligente",
        total: result.candidatos.length,
        fontes: result.fontes_consultadas,
      } as never,
      owner_id: context.userId,
    });

    return result;
  });

export const savePartFromSmartSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    const c = data.candidate;
    
    // UPSERT logic: check by OEM first, then Internal Code
    let existingId: string | null = null;
    
    if (c.codigo_original) {
      const { data: byOem } = await context.supabase
        .from("pecas")
        .select("id")
        .eq("codigo_original", c.codigo_original)
        .limit(1)
        .maybeSingle();
      if (byOem) existingId = byOem.id;
    }
    
    if (!existingId && c.codigo_interno) {
      const { data: byInternal } = await context.supabase
        .from("pecas")
        .select("id")
        .eq("codigo_interno", c.codigo_interno)
        .limit(1)
        .maybeSingle();
      if (byInternal) existingId = byInternal.id;
    }

    const payload = {
      owner_id: context.userId,
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
      equivalencias: c.equivalencias ?? [],
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
      importado_por: context.userId,
      importado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingId) {
      const { error } = await context.supabase
        .from("pecas")
        .update(payload)
        .eq("id", existingId);
      if (error) throw new Error(error.message);
      return { id: existingId, status: "updated" };
    } else {
      const { data: inserted, error } = await context.supabase
        .from("pecas")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: inserted.id, status: "created" };
    }
  });
