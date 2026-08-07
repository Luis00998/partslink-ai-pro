import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  listarPecasDoVeiculo,
  resolverVeiculoPorVin,
  vincularPecaAoVeiculo,
} from "./vehicle.server";

const VinInput = z.object({ vin: z.string().trim().min(3).max(17) });

/**
 * Fluxo oficial: tabela `veiculos` → API pública NHTSA vPIC → gravação
 * permanente. O mesmo VIN nunca é consultado duas vezes na API externa e a
 * chave/URL da API permanece exclusivamente no backend.
 */
export const decodeVin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VinInput.parse(d))
  .handler(async ({ data, context }) =>
    resolverVeiculoPorVin(context.supabase, data.vin, context.userId),
  );

const VeiculoIdInput = z.object({ veiculo_id: z.string().uuid() });

/** Peças já relacionadas ao veículo (resposta instantânea pelo banco). */
export const obterPecasDoVeiculo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VeiculoIdInput.parse(d))
  .handler(async ({ data, context }) => listarPecasDoVeiculo(context.supabase, data.veiculo_id));

const VinculoInput = z.object({
  veiculo_id: z.string().uuid(),
  peca_id: z.string().uuid(),
  codigo_original: z.string().nullable().optional(),
  codigo_interno: z.string().nullable().optional(),
  codigo_paralelo: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  origem: z.string().optional(),
  confidence: z.enum(["alta", "media", "baixa"]).optional(),
});

/** Cria/atualiza o relacionamento veículo ↔ peça (UPSERT atômico). */
export const vincularPecaVeiculo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VinculoInput.parse(d))
  .handler(async ({ data, context }) => {
    const id = await vincularPecaAoVeiculo(
      context.supabase,
      context.userId,
      data.veiculo_id,
      data.peca_id,
      {
        codigo_original: data.codigo_original ?? null,
        codigo_interno: data.codigo_interno ?? null,
        codigo_paralelo: data.codigo_paralelo ?? null,
        observacoes: data.observacoes ?? null,
        origem: data.origem ?? "manual",
        confidence: data.confidence ?? "media",
      },
    );
    return { id, ok: id !== null };
  });

const PlacaInput = z.object({ placa: z.string().trim().min(6).max(10) });

/**
 * Consulta de placa brasileira: sem API pública gratuita confiável.
 * Retornamos aviso claro em vez de dados inventados (regra do projeto).
 */
export const decodePlaca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PlacaInput.parse(d))
  .handler(async ({ data }) => {
    return {
      placa: data.placa.toUpperCase(),
      error:
        "Consulta por placa não disponível: não há API pública gratuita confiável para dados de placas brasileiras. Configure uma API paga (Sinesp Cidadão, WDAPI2, API Carros) para ativar esta busca. Nenhuma informação inventada será apresentada.",
    };
  });
