import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ChatInputData } from "./parts-ai.schemas";
import type { SmartSearchResult } from "./smart-search.types";
import { performSmartSearch } from "./smart-search.server";

const SYSTEM_PROMPT = `Você é o Parts AI, assistente técnico do PartsLink AI Pro — catálogo técnico de peças automotivas (linha pesada e leve).

FLUXO OBRIGATÓRIO PARA PERGUNTAS TÉCNICAS:
1. Toda pergunta sobre código de peça, equivalência, conversão, aplicação, montadora, motor, veículo ou nome de peça DEVE chamar a ferramenta "buscar_pecas".
2. A ferramenta SEMPRE consulta primeiro a base interna.
3. Se a base interna retornar zero resultados, a ferramenta aciona automaticamente a Pesquisa Inteligente: Tavily + Firecrawl + extração de códigos OEM.
4. Se a Pesquisa Inteligente retornar candidatos, responda usando APENAS esses candidatos externos e cite: código OEM, nome da peça, fabricante, aplicações, fonte com link e nível de confiança.
5. Nunca responda "Não encontrei esse código na base de dados configurada" sem antes receber da ferramenta a confirmação de que Tavily e Firecrawl foram consultados.
6. Se a base interna e as fontes públicas não trouxerem candidatos confiáveis, responda exatamente: "Nenhuma referência pública encontrada." e informe em uma linha que a base interna também não retornou registros.

REGRAS ABSOLUTAS DE PRECISÃO:
- NUNCA responda uma pergunta técnica usando apenas o conhecimento do modelo.
- Nunca cite Tecfil, Mann, Mahle, Bosch, Fram, Wega, Donaldson, Fleetguard, Baldwin, Hengst, SKF, Timken, Delphi ou qualquer marca como equivalência a menos que venha do resultado da ferramenta.
- Nunca invente descrição, aplicação, motor compatível, ano, fabricante, código OEM ou conversão que não esteja no resultado da ferramenta.
- Ao apresentar resultado interno, sempre mostre: código original, descrição oficial, fabricante e, quando houver, aplicação — todos vindos direto dos dados retornados.

Conversas gerais (saudação, "como você funciona", "o que você faz") podem ser respondidas sem ferramenta.
Sempre em português do Brasil, tom técnico e direto.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "buscar_pecas",
      description:
        "Consulta a base interna de peças. Se não encontrar resultados, aciona automaticamente a Pesquisa Inteligente via Tavily + Firecrawl e extrai códigos OEM de fontes públicas. Use sempre antes de responder perguntas técnicas sobre códigos, equivalências ou aplicações.",
      parameters: {
        type: "object",
        properties: {
          termo: { type: "string", description: "Código, veículo ou palavra-chave a buscar (mínimo 2 caracteres)" },
        },
        required: ["termo"],
      },
    },
  },
];

type PartsAiContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

type GatewayMessage = Record<string, unknown>;

type PartRow = {
  codigo_original: string | null;
  codigo_interno: string | null;
  codigo_paralelo: string | null;
  codigo_barras: string | null;
  descricao: string | null;
  aplicacao: string | null;
  fabricante: string | null;
  marca: string | null;
  categoria: string | null;
  motores_compativeis: string | null;
  chassis_compativeis: string | null;
  preco_venda: number | null;
  estoque: number | null;
};

function latestUserText(messages: ChatInputData["messages"]) {
  const latest = [...messages].reverse().find((message) => message.role === "user");
  return latest?.content.trim() ?? "";
}

function looksTechnical(text: string) {
  const normalized = text.toLowerCase();
  const keywords = [
    "oem",
    "código",
    "codigo",
    "peça",
    "peca",
    "filtro",
    "motor",
    "atego",
    "actros",
    "accelo",
    "scania",
    "volvo",
    "mercedes",
    "vw",
    "ford",
    "iveco",
    "aplicação",
    "aplicacao",
    "equivalência",
    "equivalencia",
  ];

  return keywords.some((keyword) => normalized.includes(keyword)) || /[a-z]{1,4}[-\s]?\d{3,}/i.test(text) || /\d{5,}/.test(text);
}

async function callGateway(body: unknown) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY não configurada");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Muitas requisições. Aguarde um instante.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
    throw new Error(`Erro AI: ${(await res.text()).slice(0, 500)}`);
  }
  return res.json();
}

async function logSmartHistory(context: PartsAiContext, termo: string, result: SmartSearchResult) {
  const { error } = await context.supabase.from("historico_buscas").insert({
    tipo: "smart",
    termo,
    resultado: {
      origem: "parts_ai_fallback",
      total: result.candidatos.length,
      fontes: result.fontes_consultadas,
    } as never,
    owner_id: context.userId,
  });

  if (error) console.error(`[PartsAI][Histórico] falha ao registrar Pesquisa Inteligente: ${error.message}`);
}

async function buildSearchResultForTerm(termo: string, context: PartsAiContext) {
  const clean = termo.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim();
  const like = `%${clean}%`;

  console.log(`[PartsAI][Banco] consultado termo="${clean}"`);
  const { data: rowsData, error } = await context.supabase
    .from("pecas")
    .select("codigo_original, codigo_interno, codigo_paralelo, codigo_barras, descricao, aplicacao, fabricante, marca, categoria, motores_compativeis, chassis_compativeis, preco_venda, estoque")
    .or(
      [
        `codigo_original.ilike.${like}`,
        `codigo_interno.ilike.${like}`,
        `codigo_paralelo.ilike.${like}`,
        `codigo_barras.ilike.${like}`,
        `descricao.ilike.${like}`,
        `aplicacao.ilike.${like}`,
        `fabricante.ilike.${like}`,
        `marca.ilike.${like}`,
        `categoria.ilike.${like}`,
        `motores_compativeis.ilike.${like}`,
        `chassis_compativeis.ilike.${like}`,
      ].join(","),
    )
    .limit(15);

  if (error) {
    console.error(`[PartsAI][Banco] erro termo="${clean}": ${error.message}`);
    return { encontrado: false, origem: "erro_banco", erro: error.message, resultados: [] };
  }

  const rows = (rowsData ?? []) as PartRow[];
  console.log(`[PartsAI][Banco] resultados=${rows.length} termo="${clean}"`);

  if (rows.length > 0) {
    const result = {
      encontrado: true,
      origem: "banco_interno",
      total: rows.length,
      termo_pesquisado: clean,
      resultados: rows,
      instrucao: "Use APENAS os dados internos abaixo. Não adicione códigos, marcas ou aplicações que não estejam nesta lista.",
    };
    
    // Registrar sucesso no banco interno no histórico
    await context.supabase.from("historico_buscas").insert({
      tipo: "rag",
      termo: clean,
      resultado: {
        origem: "banco_interno",
        total: rows.length,
      } as any,
      owner_id: context.userId,
    });

    console.log(`[PartsAI][Chat] resultado enviado ao chat origem=banco_interno total=${rows.length}`);
    return result;
  }

  console.log(`[PartsAI][Banco] sem resultados termo="${clean}" — acionando Pesquisa Inteligente`);
  const smart = await performSmartSearch(clean);
  await logSmartHistory(context, clean, smart);

  console.log(
    `[PartsAI][SmartSearch] quantidade de resultados encontrados fontes=${smart.fontes_consultadas.length} candidatos=${smart.candidatos.length}`,
  );

  const result = {
    encontrado: smart.candidatos.length > 0,
    origem: smart.candidatos.length > 0 ? "pesquisa_inteligente" : "nenhum_resultado",
    total: smart.candidatos.length,
    termo_pesquisado: clean,
    fontes_consultadas: smart.fontes_consultadas,
    resultados: smart.candidatos,
    instrucao:
      smart.candidatos.length > 0
        ? "Use APENAS os candidatos externos abaixo. Mostre código OEM, nome da peça, fabricante, aplicações, fonte com link e nível de confiança. Não invente nenhum dado ausente."
        : "Banco interno e fontes públicas sem candidatos confiáveis. Responda exatamente: 'Nenhuma referência pública encontrada.' e informe que a base interna também não retornou registros.",
  };

  console.log(`[PartsAI][Chat] resultado enviado ao chat origem=${result.origem} total=${smart.candidatos.length}`);
  return result;
}

function parseToolArguments(raw: string) {
  try {
    const parsed = JSON.parse(raw || "{}");
    return typeof parsed?.termo === "string" ? parsed.termo.trim() : "";
  } catch {
    return "";
  }
}

function deterministicAnswer(result: Record<string, unknown>) {
  const origem = result.origem;
  const resultados = Array.isArray(result.resultados) ? result.resultados : [];

  if (origem === "pesquisa_inteligente" && resultados.length > 0) {
    const lines = resultados.map((item, index) => {
      const candidate = item as {
        codigo_original?: string | null;
        descricao?: string;
        fabricante?: string | null;
        aplicacao?: string | null;
        fonte_url?: string;
        fonte_confianca?: string;
      };
      return `${index + 1}. OEM: ${candidate.codigo_original ?? "não informado"}\n   Peça: ${candidate.descricao ?? "não informado"}\n   Fabricante: ${candidate.fabricante ?? "não informado"}\n   Aplicações: ${candidate.aplicacao ?? "não informado"}\n   Fonte: ${candidate.fonte_url ?? "não informada"}\n   Confiança: ${candidate.fonte_confianca ?? "media"}\n   [Clique no botão Adicionar ao Catálogo para salvar esta peça]`;
    });
    return `Encontrei referência(s) públicas após consultar a base interna e acionar Tavily + Firecrawl:\n\n${lines.join("\n\n")}`;
  }

  if (origem === "banco_interno" && resultados.length > 0) {
    const lines = resultados.map((item, index) => {
      const row = item as PartRow;
      return `${index + 1}. Código original: ${row.codigo_original ?? "não informado"}\n   Descrição: ${row.descricao ?? "não informada"}\n   Fabricante: ${row.fabricante ?? "não informado"}\n   Aplicação: ${row.aplicacao ?? "não informada"}`;
    });
    return `Encontrei na base interna:\n\n${lines.join("\n\n")}`;
  }

  return "Nenhuma referência pública encontrada. A base interna também não retornou registros para esse termo.";
}

export async function runPartsAIChat(data: ChatInputData, context: PartsAiContext) {
  const userText = latestUserText(data.messages);
  const forceSearch = looksTechnical(userText);
  const messages: GatewayMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...data.messages];

  for (let step = 0; step < 3; step++) {
    const json = await callGateway({
      model: "google/gemini-3.6-flash",
      messages,
      tools: TOOLS,
      tool_choice: forceSearch && step === 0 ? { type: "function", function: { name: "buscar_pecas" } } : "auto",
    });
    const msg = json.choices?.[0]?.message;
    if (!msg) throw new Error("Resposta vazia do modelo.");

    const toolCalls = msg.tool_calls as Array<{
      id: string;
      function: { name: string; arguments: string };
    }> | undefined;

    if (!toolCalls || toolCalls.length === 0) {
      if (forceSearch && step === 0 && userText.length >= 2) {
        console.warn("[PartsAI][Chat] modelo não chamou buscar_pecas; executando fluxo determinístico obrigatório");
        const result = await buildSearchResultForTerm(userText, context);
        const content = deterministicAnswer(result);
        console.log(`[PartsAI][Chat] resultado enviado ao chat origem=deterministico caracteres=${content.length}`);
        return { content };
      }
      console.log(`[PartsAI][Chat] resultado enviado ao chat origem=modelo caracteres=${String(msg.content ?? "").length}`);
      return { content: msg.content ?? "" };
    }

    messages.push(msg);

    for (const call of toolCalls) {
      const termo = parseToolArguments(call.function.arguments);
      const toolResult =
        call.function.name === "buscar_pecas" && termo.length >= 2
          ? await buildSearchResultForTerm(termo, context)
          : { encontrado: false, erro: "Termo muito curto ou ferramenta desconhecida.", resultados: [] };

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(toolResult),
      });
    }
  }

  console.warn("[PartsAI][Chat] limite de tool-calling atingido sem resposta final");
  return { content: "Não consegui concluir a consulta. Tente reformular a pergunta." };
}