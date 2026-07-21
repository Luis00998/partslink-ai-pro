import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const pecaSchema = z.object({
  codigo_original: z.string().trim().max(120).optional().nullable(),
  codigo_interno: z.string().trim().max(120).optional().nullable(),
  descricao: z.string().trim().min(1, "descricao obrigatória").max(500),
  fabricante: z.string().trim().max(120).optional().nullable(),
  categoria: z.string().trim().max(120).optional().nullable(),
  aplicacao: z.string().trim().max(2000).optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
  imagem_url: z.string().trim().url().max(1000).optional().nullable().or(z.literal("")),
});

const inputSchema = z.object({
  rows: z.array(z.record(z.string(), z.any())).min(1).max(5000),
});

export type ImportRowResult = {
  row: number;
  action: "inserted" | "updated" | "rejected";
  reason?: string;
  codigo?: string | null;
};

export type ImportSummary = {
  total: number;
  inserted: number;
  updated: number;
  rejected: number;
  results: ImportRowResult[];
};

export const importPecas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }): Promise<ImportSummary> => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas administradores podem importar peças.");

    const summary: ImportSummary = {
      total: data.rows.length,
      inserted: 0,
      updated: 0,
      rejected: 0,
      results: [],
    };

    for (let i = 0; i < data.rows.length; i++) {
      const rowNum = i + 2; // considerando cabeçalho na linha 1
      const raw = data.rows[i];
      const cleaned = {
        codigo_original: str(raw.codigo_original),
        codigo_interno: str(raw.codigo_interno),
        descricao: str(raw.descricao),
        fabricante: str(raw.fabricante),
        categoria: str(raw.categoria),
        aplicacao: str(raw.aplicacao),
        observacoes: str(raw.observacoes),
        imagem_url: str(raw.imagem_url),
      };

      const parsed = pecaSchema.safeParse(cleaned);
      if (!parsed.success) {
        summary.rejected++;
        summary.results.push({
          row: rowNum,
          action: "rejected",
          reason: parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; "),
          codigo: cleaned.codigo_original ?? cleaned.codigo_interno,
        });
        continue;
      }

      const p = parsed.data;
      const payload = {
        owner_id: userId,
        codigo_original: p.codigo_original || null,
        codigo_interno: p.codigo_interno || null,
        descricao: p.descricao,
        fabricante: p.fabricante || null,
        categoria: p.categoria || null,
        aplicacao: p.aplicacao || null,
        observacoes: p.observacoes || null,
        imagem_url: p.imagem_url || null,
      };

      const key = payload.codigo_original || payload.codigo_interno;
      let existingId: string | null = null;
      if (key) {
        const q = supabase.from("pecas").select("id").eq("owner_id", userId).limit(1);
        const { data: found } = payload.codigo_original
          ? await q.eq("codigo_original", payload.codigo_original)
          : await q.eq("codigo_interno", payload.codigo_interno!);
        existingId = found?.[0]?.id ?? null;
      }

      if (existingId) {
        const { error } = await supabase.from("pecas").update(payload).eq("id", existingId);
        if (error) {
          summary.rejected++;
          summary.results.push({ row: rowNum, action: "rejected", reason: error.message, codigo: key });
        } else {
          summary.updated++;
          summary.results.push({ row: rowNum, action: "updated", codigo: key });
        }
      } else {
        const { error } = await supabase.from("pecas").insert(payload);
        if (error) {
          summary.rejected++;
          summary.results.push({ row: rowNum, action: "rejected", reason: error.message, codigo: key });
        } else {
          summary.inserted++;
          summary.results.push({ row: rowNum, action: "inserted", codigo: key });
        }
      }
    }

    return summary;
  });

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}
