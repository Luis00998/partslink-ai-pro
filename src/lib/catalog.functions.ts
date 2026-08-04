import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PecaIdInput, UnifiedSearchInput } from "./catalog.schemas";
import { buscarPecasNoBanco, registrarHistorico, type UnifiedPart } from "./catalog.server";

export type { UnifiedPart } from "./catalog.server";

/** Pesquisa unificada no catálogo: OEM, interno, paralelo, descrição, marca, fabricante,
 *  categoria, aplicação, motores e chassis — tolerante a acentos, caixa e digitação. */
export const buscarPecasCatalogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UnifiedSearchInput.parse(d))
  .handler(async ({ data, context }): Promise<{ total: number; resultados: UnifiedPart[] }> => {
    const resultados = await buscarPecasNoBanco(context.supabase, data.termo, data.limite);
    await registrarHistorico(context.supabase, context.userId, "catalogo", data.termo, {
      origem: "banco_interno",
      total: resultados.length,
    });
    return { total: resultados.length, resultados };
  });

/** Todos os diagramas explodidos em que a peça aparece (relação inversa). */
export const obterDiagramasDaPeca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PecaIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("obter_diagramas_da_peca", {
      p_peca_id: data.peca_id,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
