import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SearchInput = z.object({
  termo: z.string().trim().min(2).max(120),
  tipo: z.enum(["original", "fabricante", "nome"]).default("original"),
});

const SaveInput = z.object({
  candidate: z.object({
    codigo_original: z.string().nullable().optional(),
    codigo_interno: z.string().nullable().optional(),
    descricao: z.string().min(1),
    fabricante: z.string().nullable().optional(),
    categoria: z.string().nullable().optional(),
    aplicacao: z.string().nullable().optional(),
    fonte_url: z.string().url(),
    fonte_confianca: z.enum(["alta", "media", "baixa"]).default("media"),
  }),
  termo_original: z.string().optional(),
});

export type SmartCandidate = {
  codigo_original: string | null;
  codigo_interno: string | null;
  descricao: string;
  fabricante: string | null;
  categoria: string | null;
  aplicacao: string | null;
  fonte_url: string;
  fonte_nome: string;
  fonte_confianca: "alta" | "media" | "baixa";
  justificativa?: string;
};

export type SmartSearchResult = {
  encontrado: boolean;
  candidatos: SmartCandidate[];
  fontes_consultadas: Array<{ url: string; title: string }>;
  termo: string;
};

type PublicSource = { url: string; title: string; description: string; markdown: string };

async function firecrawlSearch(termo: string): Promise<PublicSource[]> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const fcKey = process.env.FIRECRAWL_API_KEY;
  if (!lovableKey || !fcKey) return [];

  const query = `${termo} peça automotiva OEM fabricante aplicação`;
  const res = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": fcKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit: 6,
      lang: "pt",
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });
  if (!res.ok) {
    console.error(`[Firecrawl] ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return [];
  }
  const json = (await res.json()) as {
    data?: Array<{ url?: string; title?: string; description?: string; markdown?: string }>;
    web?: Array<{ url?: string; title?: string; description?: string; markdown?: string }>;
  };
  const rows = json.data ?? json.web ?? [];
  return rows
    .filter((r) => r.url)
    .map((r) => ({
      url: r.url!,
      title: r.title ?? "",
      description: r.description ?? "",
      markdown: (r.markdown ?? "").slice(0, 4000),
    }));
}

async function tavilySearch(termo: string): Promise<PublicSource[]> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) return [];

  const query = `${termo} peça automotiva OEM fabricante aplicação`;
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: tavilyKey,
      query,
      search_depth: "advanced",
      include_answer: false,
      include_raw_content: true,
      max_results: 6,
    }),
  });
  if (!res.ok) {
    console.error(`[Tavily] ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return [];
  }
  const json = (await res.json()) as {
    results?: Array<{ url?: string; title?: string; content?: string; raw_content?: string }>;
  };
  return (json.results ?? [])
    .filter((r) => r.url)
    .map((r) => ({
      url: r.url!,
      title: r.title ?? "",
      description: r.content ?? "",
      markdown: (r.raw_content ?? r.content ?? "").slice(0, 4000),
    }));
}

async function publicSearch(termo: string): Promise<PublicSource[]> {
  const [fc, tv] = await Promise.all([firecrawlSearch(termo), tavilySearch(termo)]);
  const seen = new Set<string>();
  const merged: PublicSource[] = [];
  for (const s of [...fc, ...tv]) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    merged.push(s);
  }
  if (merged.length === 0 && !process.env.FIRECRAWL_API_KEY && !process.env.TAVILY_API_KEY) {
    throw new Error("Pesquisa Inteligente indisponível (nenhum provedor de busca configurado).");
  }
  return merged.slice(0, 8);
}

async function extractCandidatesWithAI(
  termo: string,
  sources: Array<{ url: string; title: string; description: string; markdown: string }>,
): Promise<SmartCandidate[]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY não configurada");

  const context = sources
    .map(
      (s, i) =>
        `### Fonte ${i + 1}\nURL: ${s.url}\nTítulo: ${s.title}\nDescrição: ${s.description}\nConteúdo:\n${s.markdown}`,
    )
    .join("\n\n---\n\n");

  const systemPrompt = `Você é um extrator técnico de peças automotivas. Recebe conteúdo de páginas públicas e extrai APENAS informações que estejam EXPLICITAMENTE presentes no texto. NUNCA invente códigos OEM, fabricantes, descrições ou aplicações. Se um campo não estiver claro na fonte, retorne null. Idioma: português do Brasil.

Retorne SOMENTE um JSON válido no formato:
{
  "candidatos": [
    {
      "codigo_original": "string OEM exatamente como aparece na fonte, ou null",
      "codigo_interno": "código do fabricante/interno, ou null",
      "descricao": "nome/descrição técnica da peça (obrigatório)",
      "fabricante": "marca fabricante, ou null",
      "categoria": "categoria técnica (filtro, motor, freio, etc.), ou null",
      "aplicacao": "aplicações/veículos compatíveis mencionados na fonte, ou null",
      "fonte_url": "URL exata da fonte usada",
      "fonte_nome": "nome do site (ex: Tecfil, Bosch, MercadoLivre)",
      "fonte_confianca": "alta | media | baixa",
      "justificativa": "1 frase explicando por que essa correspondência é confiável"
    }
  ]
}

Regras de confiança:
- "alta": site oficial do fabricante ou distribuidor oficial, com código OEM idêntico ao pesquisado.
- "media": marketplace técnico (MercadoLivre, catálogos), com código presente e descrição coerente.
- "baixa": menção parcial, sem confirmação do código.

Deduplique candidatos com o mesmo codigo_original. Máximo 5 candidatos. Se nenhuma fonte contiver informação confiável, retorne { "candidatos": [] }.`;

  const userPrompt = `Termo pesquisado: "${termo}"

Extraia candidatos das fontes abaixo:

${context}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Muitas requisições. Aguarde um instante.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`Erro AI: ${(await res.text()).slice(0, 200)}`);
  }
  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: { candidatos?: SmartCandidate[] } = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  const list = Array.isArray(parsed.candidatos) ? parsed.candidatos : [];
  return list
    .filter((c) => c && c.descricao && c.fonte_url)
    .slice(0, 5)
    .map((c) => ({
      codigo_original: c.codigo_original ?? null,
      codigo_interno: c.codigo_interno ?? null,
      descricao: String(c.descricao),
      fabricante: c.fabricante ?? null,
      categoria: c.categoria ?? null,
      aplicacao: c.aplicacao ?? null,
      fonte_url: String(c.fonte_url),
      fonte_nome: c.fonte_nome ?? new URL(String(c.fonte_url)).hostname,
      fonte_confianca: (["alta", "media", "baixa"].includes(String(c.fonte_confianca))
        ? c.fonte_confianca
        : "media") as "alta" | "media" | "baixa",
      justificativa: c.justificativa ?? undefined,
    }));
}

export const smartSearchPart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SearchInput.parse(d))
  .handler(async ({ data, context }): Promise<SmartSearchResult> => {
    const sources = await firecrawlSearch(data.termo);
    const candidatos = sources.length > 0 ? await extractCandidatesWithAI(data.termo, sources) : [];

    // registrar no histórico
    await context.supabase.from("historico_buscas").insert({
      tipo: "smart",
      termo: data.termo,
      resultado: {
        origem: "pesquisa_inteligente",
        total: candidatos.length,
        fontes: sources.map((s) => ({ url: s.url, title: s.title })),
      } as never,
      owner_id: context.userId,
    });

    return {
      encontrado: candidatos.length > 0,
      candidatos,
      fontes_consultadas: sources.map((s) => ({ url: s.url, title: s.title })),
      termo: data.termo,
    };
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
