import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;
type VeiculoRow = Database["public"]["Tables"]["veiculos"]["Row"];

export type VehicleInfo = {
  source: string;
  veiculo_id: string | null;
  vin: string;
  fabricante: string | null;
  marca: string | null;
  modelo: string | null;
  ano: string | null;
  motor: string | null;
  cilindrada: string | null;
  potencia: string | null;
  combustivel: string | null;
  transmissao: string | null;
  cabine: string | null;
  tracao: string | null;
  pais: string | null;
  serie: string | null;
  confianca: string | null;
  error: string | null;
};

const clean = (v?: string | null) =>
  v && v.trim() && v !== "Not Applicable" ? v.trim() : null;

function mapRow(row: VeiculoRow, source: string): VehicleInfo {
  return {
    source,
    veiculo_id: row.id,
    vin: row.vin ?? "",
    fabricante: row.fabricante ?? row.marca ?? null,
    marca: row.marca ?? null,
    modelo: row.modelo ?? null,
    ano: row.ano ? String(row.ano) : null,
    motor: row.motor ?? null,
    cilindrada: row.cilindrada ?? null,
    potencia: row.potencia ?? null,
    combustivel: row.combustivel ?? null,
    transmissao: row.cambio ?? null,
    cabine: row.cabine ?? null,
    tracao: row.tracao ?? null,
    pais: row.pais ?? null,
    serie: row.serie ?? null,
    confianca: row.confianca ?? null,
    error: null,
  };
}

/** Camada 1 — banco de dados. Atualiza `ultimo_acesso` via RPC. */
async function lerVeiculoNoBanco(supabase: Client, vin: string) {
  const { data, error } = await supabase.rpc("obter_veiculo_por_vin", { p_vin: vin });
  if (error) {
    console.error(`[Veiculo][Banco] erro vin="${vin}": ${error.message}`);
    return null;
  }
  const rows = (data ?? []) as VeiculoRow[];
  return rows[0] ?? null;
}

/** Camada 2 — API pública NHTSA vPIC (sempre no backend). */
async function consultarApiVin(vin: string) {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("API de chassi indisponível");
  const json = (await res.json()) as { Results?: Array<Record<string, string>> };
  const r = json.Results?.[0] ?? {};
  return {
    marca: clean(r.Make),
    modelo: clean(r.Model),
    fabricante: clean(r.Manufacturer) ?? clean(r.Make),
    ano: clean(r.ModelYear),
    motor: clean(r.EngineModel) ?? clean(r.EngineConfiguration),
    cilindrada: clean(r.DisplacementL),
    potencia: clean(r.EngineHP),
    combustivel: clean(r.FuelTypePrimary),
    cambio: clean(r.TransmissionStyle),
    cabine: clean(r.BodyClass),
    tracao: clean(r.DriveType),
    pais: clean(r.PlantCountry),
    serie: clean(r.Series),
    apiError: r.ErrorCode && r.ErrorCode !== "0" ? r.ErrorText ?? null : null,
  };
}

/**
 * Fluxo oficial do VIN: banco → API pública → gravação permanente.
 * Um mesmo VIN nunca é consultado duas vezes na API externa.
 */
export async function resolverVeiculoPorVin(
  supabase: Client,
  vinRaw: string,
  userId?: string,
): Promise<VehicleInfo> {
  const vin = vinRaw.trim().toUpperCase();

  const existente = await lerVeiculoNoBanco(supabase, vin);
  if (existente) {
    console.log(`[Veiculo][Banco] HIT vin="${vin}"`);
    return mapRow(existente, "banco_local");
  }

  console.log(`[Veiculo][Banco] MISS vin="${vin}" — consultando API VIN`);
  let api: Awaited<ReturnType<typeof consultarApiVin>>;
  try {
    api = await consultarApiVin(vin);
  } catch (e) {
    return {
      source: "NHTSA vPIC",
      veiculo_id: null,
      vin,
      fabricante: null,
      marca: null,
      modelo: null,
      ano: null,
      motor: null,
      cilindrada: null,
      potencia: null,
      combustivel: null,
      transmissao: null,
      cabine: null,
      tracao: null,
      pais: null,
      serie: null,
      confianca: null,
      error: (e as Error).message,
    };
  }

  const identificado = Boolean(api.marca || api.modelo);
  if (!identificado) {
    return {
      source: "NHTSA vPIC",
      veiculo_id: null,
      vin,
      fabricante: null,
      marca: null,
      modelo: null,
      ano: api.ano,
      motor: api.motor,
      cilindrada: api.cilindrada,
      potencia: api.potencia,
      combustivel: api.combustivel,
      transmissao: api.cambio,
      cabine: api.cabine,
      tracao: api.tracao,
      pais: api.pais,
      serie: api.serie,
      confianca: "baixa",
      error: api.apiError ?? "Informação não encontrada para este chassi.",
    };
  }

  const { data: inserted, error } = await supabase
    .from("veiculos")
    .upsert(
      {
        vin,
        chassis: vin,
        marca: api.marca,
        modelo: api.modelo,
        fabricante: api.fabricante,
        ano: api.ano ? Number(api.ano) || null : null,
        motor: api.motor,
        cilindrada: api.cilindrada,
        potencia: api.potencia,
        combustivel: api.combustivel,
        cambio: api.cambio,
        cabine: api.cabine,
        tracao: api.tracao,
        pais: api.pais,
        serie: api.serie,
        confianca: api.apiError ? "media" : "alta",
        fonte: "NHTSA vPIC",
        owner_id: null,
        ultimo_acesso: new Date().toISOString(),
      },
      { onConflict: "vin" },
    )
    .select("*")
    .maybeSingle();

  if (error || !inserted) {
    console.error(`[Veiculo][Gravação] falha vin="${vin}": ${error?.message ?? "sem retorno"}`);
    return {
      source: "NHTSA vPIC",
      veiculo_id: null,
      vin,
      fabricante: api.fabricante,
      marca: api.marca,
      modelo: api.modelo,
      ano: api.ano,
      motor: api.motor,
      cilindrada: api.cilindrada,
      potencia: api.potencia,
      combustivel: api.combustivel,
      transmissao: api.cambio,
      cabine: api.cabine,
      tracao: api.tracao,
      pais: api.pais,
      serie: api.serie,
      confianca: "media",
      error: null,
    };
  }

  console.log(`[Veiculo][Gravação] vin="${vin}" salvo id=${inserted.id} user=${userId ?? "-"}`);
  return mapRow(inserted, "api_vin");
}

/** Relacionamento veículo → peças já conhecidas (resposta instantânea). */
export async function listarPecasDoVeiculo(supabase: Client, veiculoId: string) {
  const { data, error } = await supabase.rpc("obter_pecas_do_veiculo", { p_veiculo_id: veiculoId });
  if (error) {
    console.error(`[Veiculo][Peças] erro veiculo=${veiculoId}: ${error.message}`);
    return [];
  }
  const rows = data ?? [];
  console.log(`[Veiculo][Peças] veiculo=${veiculoId} total=${rows.length}`);
  return rows;
}

/** UPSERT atômico do relacionamento veículo ↔ peça (nunca duplica o par). */
export async function vincularPecaAoVeiculo(
  supabase: Client,
  userId: string,
  veiculoId: string,
  pecaId: string,
  extras: {
    codigo_original?: string | null;
    codigo_interno?: string | null;
    codigo_paralelo?: string | null;
    observacoes?: string | null;
    origem?: string;
    confidence?: string;
  } = {},
) {
  const { data, error } = await supabase
    .from("veiculo_pecas")
    .upsert(
      {
        veiculo_id: veiculoId,
        peca_id: pecaId,
        codigo_original: extras.codigo_original ?? null,
        codigo_interno: extras.codigo_interno ?? null,
        codigo_paralelo: extras.codigo_paralelo ?? null,
        observacoes: extras.observacoes ?? null,
        origem: extras.origem ?? "manual",
        confidence: extras.confidence ?? "media",
        created_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "veiculo_id,peca_id" },
    )
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(`[Veiculo][Vínculo] falha veiculo=${veiculoId} peca=${pecaId}: ${error.message}`);
    return null;
  }
  console.log(`[Veiculo][Vínculo] ok veiculo=${veiculoId} peca=${pecaId}`);
  return data?.id ?? null;
}
