import { z } from "zod";

export const VeiculoInput = z.object({
  cliente_id: z.string().uuid().nullable().optional(),
  placa: z.string().trim().max(10).nullable().optional(),
  vin: z.string().trim().max(30).nullable().optional(),
  chassis: z.string().trim().max(60).nullable().optional(),
  marca: z.string().trim().min(1, "Marca obrigatória").max(60),
  modelo: z.string().trim().min(1, "Modelo obrigatório").max(80),
  ano: z.number().int().min(1900).max(2100).nullable().optional(),
  motor: z.string().trim().max(80).nullable().optional(),
  versao: z.string().trim().max(80).nullable().optional(),
  km_atual: z.number().int().nonnegative().nullable().optional(),
  observacoes: z.string().trim().max(2000).nullable().optional(),
});

export const VeiculoUpdateInput = z.object({
  id: z.string().uuid(),
  patch: VeiculoInput.partial(),
});

export const OrcamentoInput = z.object({
  veiculo_id: z.string().uuid().nullable().optional(),
  cliente_id: z.string().uuid().nullable().optional(),
  cliente_nome: z.string().trim().max(200).nullable().optional(),
  veiculo_info: z.string().trim().max(300).nullable().optional(),
  observacoes: z.string().trim().max(4000).nullable().optional(),
  valor_hora: z.number().nonnegative().default(0),
  mao_de_obra: z.number().nonnegative().default(0),
  desconto: z.number().nonnegative().default(0),
  frete: z.number().nonnegative().default(0),
});

export const OrcamentoUpdateInput = z.object({
  id: z.string().uuid(),
  patch: OrcamentoInput.partial().extend({
    status: z.enum(["aberto", "aprovado", "recusado", "finalizado", "cancelado"]).optional(),
  }),
});

export const OrcamentoItemInput = z.object({
  orcamento_id: z.string().uuid(),
  peca_id: z.string().uuid().nullable().optional(),
  codigo: z.string().trim().max(80).nullable().optional(),
  descricao: z.string().trim().min(1, "Descrição obrigatória").max(300),
  quantidade: z.number().positive().default(1),
  preco_unitario: z.number().nonnegative().default(0),
});

export const OrcamentoServicoInput = z.object({
  orcamento_id: z.string().uuid(),
  servico_id: z.string().uuid().nullable().optional(),
  descricao: z.string().trim().min(1, "Descrição obrigatória").max(300),
  tempo_horas: z.number().nonnegative().default(0),
  valor_hora: z.number().nonnegative().default(0),
  observacoes: z.string().trim().max(2000).nullable().optional(),
});

export const IdInput = z.object({ id: z.string().uuid() });
export const OrcamentoIdInput = z.object({ orcamento_id: z.string().uuid() });
export const ServicoIdInput = z.object({ servico_id: z.string().uuid() });

export const ServicoInput = z.object({
  codigo: z.string().trim().max(40).nullable().optional(),
  nome: z.string().trim().min(1, "Nome obrigatório").max(200),
  categoria: z.string().trim().max(80).nullable().optional(),
  sistema_id: z.string().uuid().nullable().optional(),
  descricao: z.string().trim().max(2000).nullable().optional(),
  procedimentos: z.string().trim().max(8000).nullable().optional(),
  tempo_desmontagem: z.number().nonnegative().default(0),
  tempo_montagem: z.number().nonnegative().default(0),
  ferramentas_necessarias: z.string().trim().max(2000).nullable().optional(),
});

export const ManutencaoInput = z.object({
  veiculo_id: z.string().uuid(),
  orcamento_id: z.string().uuid().nullable().optional(),
  data_servico: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .optional(),
  km: z.number().int().nonnegative().nullable().optional(),
  descricao: z.string().trim().min(1, "Descrição obrigatória").max(500),
  servicos_realizados: z.string().trim().max(8000).nullable().optional(),
  observacoes: z.string().trim().max(4000).nullable().optional(),
  valor_total: z.number().nonnegative().default(0),
  itens: z
    .array(
      z.object({
        peca_id: z.string().uuid().nullable().optional(),
        codigo: z.string().trim().max(80).nullable().optional(),
        descricao: z.string().trim().min(1).max(300),
        quantidade: z.number().positive().default(1),
      }),
    )
    .default([]),
});

export const VeiculoIdInput = z.object({ veiculo_id: z.string().uuid() });
