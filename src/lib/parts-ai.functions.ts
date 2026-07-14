import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ChatInput = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system", "tool"]),
    content: z.string(),
    tool_call_id: z.string().optional(),
    name: z.string().optional(),
  })).min(1),
});

const SYSTEM_PROMPT = `Você é o Parts AI, assistente técnico do PartsLink AI Pro — catálogo técnico de peças automotivas (linha pesada e leve).

REGRAS ABSOLUTAS DE PRECISÃO (não negociáveis):
1. Você NUNCA responde uma pergunta técnica usando apenas o conhecimento do modelo.
2. Toda pergunta que envolva código de peça, equivalência, conversão, aplicação, montadora, motor ou veículo DEVE obrigatoriamente começar por uma chamada da ferramenta "buscar_pecas" na base de dados do usuário.
3. Se a ferramenta retornar zero resultados, você DEVE responder exatamente:
   "Não encontrei esse código na base de dados configurada."
   e explicar em uma linha o que faltou. Sem inventar códigos, sem "provavelmente é", sem equivalência de memória.
4. Nunca cite Tecfil, Mann, Mahle, Bosch, Fram, Wega, Donaldson, Fleetguard, Baldwin, Hengst, SKF, Timken, Delphi ou qualquer marca como equivalência a menos que a informação venha do resultado da ferramenta.
5. Nunca invente descrição, aplicação, motor compatível, ano ou fabricante que não esteja no resultado da ferramenta.
6. Ao apresentar um resultado, sempre mostre: código original, descrição oficial, fabricante e (quando houver) aplicação — todos vindos direto dos dados retornados.

Conversas gerais (saudação, "como você funciona", "o que você faz") podem ser respondidas sem ferramenta.
Sempre em português do Brasil, tom técnico e direto.`;

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
    throw new Error(`Erro AI: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "buscar_pecas",
      description:
        "Consulta a base de dados de peças do usuário. USE SEMPRE antes de responder qualquer pergunta técnica sobre códigos, equivalências ou aplicações. O termo é buscado em codigo_original, codigo_interno, codigo_barras, descricao, aplicacao e fabricante.",
      parameters: {
        type: "object",
        properties: {
          termo: { type: "string", description: "Código ou palavra-chave a buscar (mínimo 2 caracteres)" },
        },
        required: ["termo"],
      },
    },
  },
];

export const chatWithPartsAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    const messages: Array<Record<string, unknown>> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...data.messages,
    ];

    // RAG loop: até 3 passos de tool-calling.
    for (let step = 0; step < 3; step++) {
      const json = await callGateway({
        model: "google/gemini-3-flash-preview",
        messages,
        tools: TOOLS,
        tool_choice: step === 0 ? "auto" : "auto",
      });
      const msg = json.choices?.[0]?.message;
      if (!msg) throw new Error("Resposta vazia do modelo.");

      const toolCalls = msg.tool_calls as Array<{
        id: string;
        function: { name: string; arguments: string };
      }> | undefined;

      if (!toolCalls || toolCalls.length === 0) {
        return { content: msg.content ?? "" };
      }

      messages.push(msg);

      for (const call of toolCalls) {
        let args: { termo?: string } = {};
        try { args = JSON.parse(call.function.arguments || "{}"); } catch { /* noop */ }
        const termo = (args.termo ?? "").trim();
        let toolResult: unknown = { encontrado: false, resultados: [] };

        if (call.function.name === "buscar_pecas" && termo.length >= 2) {
          const like = `%${termo.replace(/[%_]/g, "")}%`;
          const { data: rows, error } = await context.supabase
            .from("pecas")
            .select("codigo_original, codigo_interno, codigo_barras, descricao, aplicacao, fabricante, categoria, preco_venda, estoque")
            .or(
              [
                `codigo_original.ilike.${like}`,
                `codigo_interno.ilike.${like}`,
                `codigo_barras.ilike.${like}`,
                `descricao.ilike.${like}`,
                `aplicacao.ilike.${like}`,
                `fabricante.ilike.${like}`,
              ].join(","),
            )
            .limit(15);

          if (error) {
            toolResult = { encontrado: false, erro: error.message, resultados: [] };
          } else {
            toolResult = {
              encontrado: (rows?.length ?? 0) > 0,
              total: rows?.length ?? 0,
              termo_pesquisado: termo,
              resultados: rows ?? [],
              instrucao:
                (rows?.length ?? 0) === 0
                  ? "Zero resultados. Responda EXATAMENTE: 'Não encontrei esse código na base de dados configurada.' Não invente equivalências."
                  : "Use APENAS os dados abaixo. Não adicione códigos, marcas ou aplicações que não estejam nesta lista.",
            };
          }
        } else {
          toolResult = { erro: "Termo muito curto ou ferramenta desconhecida.", resultados: [] };
        }

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: JSON.stringify(toolResult),
        });
      }
    }

    return { content: "Não consegui concluir a consulta. Tente reformular a pergunta." };
  });
