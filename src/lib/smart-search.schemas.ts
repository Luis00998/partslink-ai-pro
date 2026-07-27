import { z } from "zod";

export const SearchInput = z.object({
  termo: z.string().trim().min(2).max(120),
  tipo: z.enum(["original", "fabricante", "nome"]).default("original"),
});

export const SaveInput = z.object({
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