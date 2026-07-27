import type { PublicSource, SmartCandidate, SmartSearchResult } from "./smart-search.types";

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function safeHost(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "fonte pública";
  }
}

function extractJsonObject(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end <= start) return {};
    try {
      return JSON.parse(content.slice(start, end + 1));
    } catch {
      return {};
    }
  }
}

function normalizeSearchRows(json: unknown): PublicSource[] {
  const payload = json as {
    data?: Array<Record<string, unknown>>;
    web?: Array<Record<string, unknown>>;
    results?: Array<Record<string, unknown>>;
  };
  const rows = payload.data ?? payload.web ?? payload.results ?? [];
  const sources: PublicSource[] = [];

  for (const row of rows) {
    const url = safeUrl(row.url);
    if (!url) continue;
    const markdown = textValue(row.markdown) || textValue(row.raw_content) || textValue(row.content) || textValue(row.description);
    sources.push({
      url,
      title: textValue(row.title),
      description: textValue(row.description) || textValue(row.content),
      markdown: markdown.slice(0, 4000),
    });
  }

  return sources;
}

export async function firecrawlSearch(termo: string): Promise<PublicSource[]> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const fcKey = process.env.FIRECRAWL_API_KEY;
  const mode = fcKey?.startsWith("fc-") ? "direct" : "gateway";

  console.log(
    `[SmartSearch][Firecrawl] chamada termo="${termo}" hasFcKey=${Boolean(fcKey)} hasLovableKey=${Boolean(lovableKey)} mode=${mode}`,
  );

  if (!fcKey) {
    console.warn("[SmartSearch][Firecrawl] SKIPPED — FIRECRAWL_API_KEY ausente no backend");
    return [];
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let endpoint = "https://api.firecrawl.dev/v2/search";

  if (mode === "direct") {
    headers.Authorization = `Bearer ${fcKey}`;
  } else {
    if (!lovableKey) {
      console.warn("[SmartSearch][Firecrawl] SKIPPED — LOVABLE_API_KEY ausente para conexão gateway");
      return [];
    }
    endpoint = "https://connector-gateway.lovable.dev/firecrawl/v2/search";
    headers.Authorization = `Bearer ${lovableKey}`;
    headers["X-Connection-Api-Key"] = fcKey;
  }

  const query = `${termo} peça automotiva OEM fabricante aplicação catálogo técnico`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      limit: 6,
      lang: "pt",
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });

  console.log(`[SmartSearch][Firecrawl] status=${res.status}`);
  if (!res.ok) {
    console.error(`[SmartSearch][Firecrawl] ERROR ${res.status}: ${(await res.text()).slice(0, 500)}`);
    return [];
  }

  const sources = normalizeSearchRows(await res.json());
  console.log(`[SmartSearch][Firecrawl] resultados=${sources.length}`);
  return sources;
}

export async function tavilySearch(termo: string): Promise<PublicSource[]> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  console.log(`[SmartSearch][Tavily] chamada termo="${termo}" hasKey=${Boolean(tavilyKey)}`);

  if (!tavilyKey) {
    console.warn("[SmartSearch][Tavily] SKIPPED — TAVILY_API_KEY ausente no backend");
    return [];
  }

  const query = `${termo} peça automotiva OEM fabricante aplicação catálogo técnico`;
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

  console.log(`[SmartSearch][Tavily] status=${res.status}`);
  if (!res.ok) {
    console.error(`[SmartSearch][Tavily] ERROR ${res.status}: ${(await res.text()).slice(0, 500)}`);
    return [];
  }

  const sources = normalizeSearchRows(await res.json());
  console.log(`[SmartSearch][Tavily] resultados=${sources.length}`);
  return sources;
}

export async function publicSearch(termo: string): Promise<PublicSource[]> {
  console.log(`[SmartSearch] fallback externo iniciado termo="${termo}"`);
  const [fc, tv] = await Promise.all([
    firecrawlSearch(termo).catch((error) => {
      console.error("[SmartSearch][Firecrawl] exceção:", error);
      return [] as PublicSource[];
    }),
    tavilySearch(termo).catch((error) => {
      console.error("[SmartSearch][Tavily] exceção:", error);
      return [] as PublicSource[];
    }),
  ]);

  console.log(`[SmartSearch] quantidade por provedor firecrawl=${fc.length} tavily=${tv.length}`);

  const seen = new Set<string>();
  const merged: PublicSource[] = [];
  for (const source of [...fc, ...tv]) {
    if (seen.has(source.url)) continue;
    seen.add(source.url);
    merged.push(source);
  }

  console.log(`[SmartSearch] fontes públicas únicas=${merged.length}`);
  if (merged.length === 0 && !process.env.FIRECRAWL_API_KEY && !process.env.TAVILY_API_KEY) {
    throw new Error("Pesquisa Inteligente indisponível (nenhum provedor de busca configurado).");
  }

  return merged.slice(0, 8);
}

export async function extractCandidatesWithAI(termo: string, sources: PublicSource[]): Promise<SmartCandidate[]> {
  const key = process.env.LOVABLE_API_KEY;
  console.log(`[SmartSearch][Extractor] iniciado termo="${termo}" fontes=${sources.length} hasLovableKey=${Boolean(key)}`);
  if (!key) throw new Error("LOVABLE_API_KEY não configurada");

  const context = sources
    .map(
      (source, index) =>
        `### Fonte ${index + 1}\nURL: ${source.url}\nTítulo: ${source.title}\nDescrição: ${source.description}\nConteúdo:\n${source.markdown}`,
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
- "media": marketplace técnico, catálogo técnico ou distribuidor com código presente e descrição coerente.
- "baixa": menção parcial, sem confirmação do código.

Deduplique candidatos com o mesmo codigo_original. Máximo 5 candidatos. Se nenhuma fonte contiver informação confiável, retorne { "candidatos": [] }.`;

  const userPrompt = `Termo pesquisado: "${termo}"

Extraia candidatos das fontes abaixo:

${context}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  console.log(`[SmartSearch][Extractor] status=${res.status}`);
  if (!res.ok) {
    if (res.status === 429) throw new Error("Muitas requisições. Aguarde um instante.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`Erro AI: ${(await res.text()).slice(0, 500)}`);
  }

  const json = await res.json();
  const content = textValue(json.choices?.[0]?.message?.content, "{}");
  const parsed = extractJsonObject(content) as { candidatos?: Array<Partial<SmartCandidate>> };
  const list = Array.isArray(parsed.candidatos) ? parsed.candidatos : [];

  const candidates = list
    .filter((candidate) => candidate && candidate.descricao && safeUrl(candidate.fonte_url))
    .slice(0, 5)
    .map((candidate) => {
      const fonteUrl = safeUrl(candidate.fonte_url) ?? "https://example.com";
      const confidence = String(candidate.fonte_confianca);
      return {
        codigo_original: candidate.codigo_original ?? null,
        codigo_interno: candidate.codigo_interno ?? null,
        descricao: String(candidate.descricao),
        fabricante: candidate.fabricante ?? null,
        categoria: candidate.categoria ?? null,
        aplicacao: candidate.aplicacao ?? null,
        fonte_url: fonteUrl,
        fonte_nome: candidate.fonte_nome ?? safeHost(fonteUrl),
        fonte_confianca: (["alta", "media", "baixa"].includes(confidence) ? confidence : "media") as "alta" | "media" | "baixa",
        justificativa: candidate.justificativa ?? undefined,
      };
    });

  console.log(`[SmartSearch][Extractor] candidatos=${candidates.length}`);
  return candidates;
}

export async function performSmartSearch(termo: string): Promise<SmartSearchResult> {
  const sources = await publicSearch(termo);
  const candidatos = sources.length > 0 ? await extractCandidatesWithAI(termo, sources) : [];

  console.log(
    `[SmartSearch] resultado pronto termo="${termo}" fontes=${sources.length} candidatos=${candidatos.length}`,
  );

  return {
    encontrado: candidatos.length > 0,
    candidatos,
    fontes_consultadas: sources.map((source) => ({ url: source.url, title: source.title })),
    termo,
  };
}