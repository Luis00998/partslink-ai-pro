import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SaveInput, SearchInput } from "./smart-search.schemas";
import { performSmartSearch } from "./smart-search.server";
import { gravarCacheBusca, lerCacheBusca, registrarHistorico } from "./catalog.server";
import { persistirCandidatosConfiaveis, upsertPecaFromCandidate } from "./pecas-upsert.server";
import type { SmartSearchResult } from "./smart-search.types";

export type { SmartCandidate, SmartSearchResult } from "./smart-search.types";

/**
 * Fluxo oficial: Supabase (cache) → Tavily → Firecrawl → extração IA →
 * confiança → candidatos → persistência permanente.
 */
export const smartSearchPart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SearchInput.parse(d))
  .handler(async ({ data, context }): Promise<SmartSearchResult> => {
    console.log(`[SmartSearch] handler start user=${context.userId} termo="${data.termo}" tipo=${data.tipo}`);

    // 1) cache do banco — evita reconsultar IA/APIs externas
    const cached = await lerCacheBusca(context.supabase, data.termo);
    if (cached && cached.candidatos.length > 0) {
      await registrarHistorico(context.supabase, context.userId, "smart", data.termo, {
        origem: "cache_supabase",
        total: cached.candidatos.length,
        fontes: cached.fontes_consultadas,
      });
      return cached;
    }

    // 2) fontes externas + extração
    const result = await performSmartSearch(data.termo);

    // 3) persistência permanente (cache + catálogo)
    if (result.candidatos.length > 0) {
      await gravarCacheBusca(context.supabase, data.termo, result);
      await persistirCandidatosConfiaveis(context.supabase, context.userId, result.candidatos);
    }

    await registrarHistorico(context.supabase, context.userId, "smart", data.termo, {
      origem: "pesquisa_inteligente",
      total: result.candidatos.length,
      fontes: result.fontes_consultadas,
    });

    return result;
  });

export const savePartFromSmartSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    return upsertPecaFromCandidate(context.supabase, context.userId, data.candidate as never);
  });
