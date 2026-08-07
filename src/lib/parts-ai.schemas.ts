import { z } from "zod";

export const ChatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system", "tool"]),
        content: z.string(),
        tool_call_id: z.string().optional(),
        name: z.string().optional(),
      }),
    )
    .min(1),
});

export type ChatInputData = z.infer<typeof ChatInput>;
