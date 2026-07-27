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
    const { data: inserted, error } = await context.supabase
      .from("pecas")
      .insert({
        owner_id: context.userId,
        codigo_original: c.codigo_original ?? null,
        codigo_interno: c.codigo_interno ?? null,
        descricao: c.descricao,
        fabricante: c.fabricante ?? null,
        categoria: c.categoria ?? null,
        aplicacao: c.aplicacao ?? null,
        fonte_url: c.fonte_url,
        fonte_confianca: c.fonte_confianca,
        importado_por: context.userId,
        importado_em: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });
