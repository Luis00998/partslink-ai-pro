import { z } from "zod";

export const UnifiedSearchInput = z.object({
  termo: z.string().trim().min(2, "Informe ao menos 2 caracteres").max(160),
  limite: z.number().int().min(1).max(100).default(30),
});

export const PecaIdInput = z.object({
  peca_id: z.string().uuid("ID da peça inválido"),
});

export type UnifiedSearchInputData = z.infer<typeof UnifiedSearchInput>;
