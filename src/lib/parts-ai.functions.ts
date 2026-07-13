import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ChatInput = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })).min(1),
});

const SYSTEM_PROMPT = `Você é o Parts AI, assistente técnico do PartsLink AI Pro, especializado em peças automotivas de linha pesada (Scania, Volvo, Mercedes-Benz, VW, DAF, Iveco, MAN, Ford Trucks, Agrale, Cummins, MWM, FPT, Perkins) e linha leve.

REGRAS CRÍTICAS:
- NUNCA invente códigos originais, aplicações, equivalências ou especificações que você não conhece com certeza.
- Se não tiver certeza, responda claramente: "Não posso confirmar essa informação. Recomendo consultar o catálogo oficial da montadora ou uma fonte confirmada."
- Sempre em português do Brasil.
- Seja técnico, direto e objetivo.
- Ao sugerir equivalências entre fabricantes (Tecfil, Mann, Mahle, Bosch, etc.), avise que o usuário deve confirmar com o fornecedor antes de aplicar.`;

export const chatWithPartsAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY não configurada");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...data.messages],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Muitas requisições. Aguarde um instante.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
      const text = await res.text();
      throw new Error(`Erro AI: ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "";
    return { content };
  });
