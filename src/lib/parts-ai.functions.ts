import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ChatInput } from "./parts-ai.schemas";
import { runPartsAIChat } from "./parts-ai.server";

export const chatWithPartsAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => runPartsAIChat(data, context));
