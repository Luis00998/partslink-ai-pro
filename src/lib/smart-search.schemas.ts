import { z } from "zod";

export const SearchInput = z.object({
  termo: z.string().trim().min(2).max(120),
  tipo: z.enum(["original", "fabricante", "nome"]).default("original"),
});

export const SaveInput = z.object({
  candidate: z.object({
    codigo_original: z.string().nullable().optional(),
    codigo_interno: z.string().nullable().optional(),
    codigo_paralelo: z.string().nullable().optional(),
    descricao: z.string().min(1),
    marca: z.string().nullable().optional(),
    fabricante: z.string().nullable().optional(),
    categoria: z.string().nullable().optional(),
    subcategoria: z.string().nullable().optional(),
    aplicacao: z.string().nullable().optional(),
    motores_compativeis: z.string().nullable().optional(),
    chassis_compativeis: z.string().nullable().optional(),
    ano_inicial: z.number().nullable().optional(),
    ano_final: z.number().nullable().optional(),
    observacoes: z.string().nullable().optional(),
    equivalencias: z.array(z.any()).nullable().optional(),
    fonte_url: z.string().url(),
    fonte_nome: z.string().nullable().optional(),
    fonte_confianca: z.enum(["alta", "media", "baixa"]).default("media"),
    torque: z.string().nullable().optional(),
    quantidade_por_veiculo: z.string().nullable().optional(),
    tipo_oleo: z.string().nullable().optional(),
    quantidade_oleo: z.string().nullable().optional(),
    liquido_arrefecimento: z.string().nullable().optional(),
    ferramentas_necessarias: z.string().nullable().optional(),
    tempo_estimado: z.string().nullable().optional(),
    procedimentos_tecnicos: z.string().nullable().optional(),
    imagem_url: z.string().nullable().optional(),
    imagens_adicionais: z.array(z.string()).nullable().optional(),
  }),
  termo_original: z.string().optional(),
});