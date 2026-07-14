import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  image_data_url: z.string().startsWith("data:image/"),
});

/**
 * Descreve tecnicamente uma foto de peça usando visão computacional (Gemini)
 * e depois busca correspondências reais na base do usuário.
 * A IA NUNCA inventa códigos — apenas descreve o que vê.
 */
export const identificarPecaPorImagem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY não configurada");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Você descreve fotos de peças automotivas em português do Brasil, de forma técnica e curta. NUNCA invente código, marca ou aplicação — apenas o que a foto mostra visualmente. Responda em 1 parágrafo curto: tipo de peça, formato, características visíveis. Termine com 3 a 5 palavras-chave separadas por vírgula, prefixadas por 'palavras-chave:'.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Descreva esta peça." },
              { type: "image_url", image_url: { url: data.image_data_url } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Muitas requisições. Aguarde um instante.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados.");
      throw new Error(`Erro visão: ${(await res.text()).slice(0, 200)}`);
    }
    const json = await res.json();
    const description: string = json.choices?.[0]?.message?.content ?? "";

    const kwLine = description.split(/palavras-chave\s*:/i)[1] ?? "";
    const keywords = kwLine
      .split(/[,;\n]/)
      .map((w) => w.trim().replace(/^["'.]+|["'.]+$/g, ""))
      .filter((w) => w.length >= 3)
      .slice(0, 5);

    let resultados: Array<Record<string, unknown>> = [];
    if (keywords.length > 0) {
      const ors = keywords.flatMap((k) => [
        `descricao.ilike.%${k}%`,
        `aplicacao.ilike.%${k}%`,
        `categoria.ilike.%${k}%`,
      ]);
      const { data: rows } = await context.supabase
        .from("pecas")
        .select("id, codigo_original, descricao, fabricante, categoria, preco_venda, estoque")
        .or(ors.join(","))
        .limit(20);
      resultados = rows ?? [];
    }

    return { description, keywords, resultados };
  });
