import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const VinInput = z.object({ vin: z.string().min(3).max(17) });

/**
 * NHTSA vPIC — API pública gratuita e oficial do governo dos EUA.
 * Cobre a maioria dos VINs mundiais (17 caracteres). Nem sempre traz dados
 * completos para veículos brasileiros — nesse caso retornamos "Informação
 * não encontrada" explicitamente.
 */
export const decodeVin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => VinInput.parse(d))
  .handler(async ({ data }) => {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(data.vin)}?format=json`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("API indisponível");
      const json = (await res.json()) as { Results: Array<Record<string, string>> };
      const r = json.Results?.[0] ?? {};
      const empty = (v?: string) => (v && v.trim() && v !== "Not Applicable" ? v : null);
      return {
        source: "NHTSA vPIC" as const,
        vin: data.vin,
        fabricante: empty(r.Make),
        modelo: empty(r.Model),
        ano: empty(r.ModelYear),
        motor: empty(r.EngineModel) ?? empty(r.EngineConfiguration),
        cilindrada: empty(r.DisplacementL),
        potencia: empty(r.EngineHP),
        combustivel: empty(r.FuelTypePrimary),
        transmissao: empty(r.TransmissionStyle),
        cabine: empty(r.BodyClass),
        tracao: empty(r.DriveType),
        pais: empty(r.PlantCountry),
        serie: empty(r.Series),
        error: r.ErrorCode && r.ErrorCode !== "0" ? r.ErrorText : null,
      };
    } catch (e) {
      return { source: "NHTSA vPIC" as const, vin: data.vin, error: (e as Error).message };
    }
  });

const PlacaInput = z.object({ placa: z.string().min(6).max(10) });

/**
 * Consulta de placa brasileira: sem API pública oficial gratuita real.
 * Retornamos aviso claro em vez de dados inventados (conforme regra do projeto).
 * O usuário pode conectar uma API paga (Sinesp, API Carros, WDAPI2, etc.).
 */
export const decodePlaca = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PlacaInput.parse(d))
  .handler(async ({ data }) => {
    return {
      placa: data.placa.toUpperCase(),
      error:
        "Consulta por placa não disponível: não há API pública gratuita confiável para dados de placas brasileiras. Configure uma API paga (Sinesp Cidadão, WDAPI2, API Carros) para ativar esta busca. Nenhuma informação inventada será apresentada.",
    };
  });
