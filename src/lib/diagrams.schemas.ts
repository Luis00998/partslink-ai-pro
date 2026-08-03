import { z } from "zod";

export const CreateDiagramaCatalogoSchema = z.object({
  marca_veiculo: z.string().min(1, "Marca do veículo obrigatória"),
  modelo_veiculo: z.string().min(1, "Modelo do veículo obrigatório"),
  ano_veiculo: z.number().int().positive().optional(),
  motor_veiculo: z.string().optional(),
  versao_veiculo: z.string().optional(),
  chassis_veiculo: z.string().optional(),
  vin_veiculo: z.string().optional(),
  sistema_id: z.string().uuid("ID do sistema inválido"),
  nome_diagrama: z.string().min(1, "Nome do diagrama obrigatório"),
  descricao: z.string().optional(),
  imagem_url: z.string().url("URL da imagem inválida"),
  imagem_path: z.string().optional(),
  imagem_tamanho: z.number().positive().optional(),
  imagem_tipo: z.string().optional(),
  origem_import: z.string().optional(),
  fonte_url: z.string().url().optional(),
  hash_imagem: z.string().optional(),
});

export const CreateDiagramaItemSchema = z.object({
  diagrama_id: z.string().uuid("ID do diagrama inválido"),
  numero_referencia: z.number().int().positive("Número de referência deve ser positivo"),
  posicao_x: z.number(),
  posicao_y: z.number(),
  raio_hotspot: z.number().default(20),
  codigo_oem_diagrama: z.string().optional(),
  codigo_interno_diagrama: z.string().optional(),
  descricao_diagrama: z.string().min(1, "Descrição obrigatória"),
  marca_diagrama: z.string().optional(),
  fabricante_diagrama: z.string().optional(),
  quantidade: z.number().int().positive().default(1),
  unidade: z.string().default("unidade"),
  aplicacoes: z.string().optional(),
  motores_aplicaveis: z.string().optional(),
  chassis_aplicaveis: z.string().optional(),
  observacoes: z.string().optional(),
  posicao_montagem: z.string().optional(),
  peca_id: z.string().uuid().optional(),
});

export const UpdateDiagramaCatalogoSchema = z.object({
  nome_diagrama: z.string().min(1).optional(),
  descricao: z.string().optional(),
  imagem_url: z.string().url().optional(),
  ativo: z.boolean().optional(),
  total_itens: z.number().int().nonnegative().optional(),
  total_pecas_unicas: z.number().int().nonnegative().optional(),
  ultima_atualizacao: z.string().optional(),
});

export const UpdateDiagramaItemSchema = z.object({
  numero_referencia: z.number().int().positive().optional(),
  posicao_x: z.number().optional(),
  posicao_y: z.number().optional(),
  raio_hotspot: z.number().optional(),
  codigo_oem_diagrama: z.string().optional(),
  descricao_diagrama: z.string().min(1).optional(),
  quantidade: z.number().int().positive().optional(),
  peca_id: z.string().uuid().optional(),
});

export const BuscarDiagramasVeiculoSchema = z.object({
  marca: z.string().min(1, "Marca obrigatória"),
  modelo: z.string().min(1, "Modelo obrigatório"),
  ano: z.number().int().optional(),
  motor: z.string().optional(),
});

export const BulkImportDiagramasSchema = z.object({
  diagramas: z.array(CreateDiagramaCatalogoSchema),
  itens: z.array(CreateDiagramaItemSchema),
});

export const MapeamentoOEMSchema = z.object({
  diagrama_id: z.string().uuid(),
  item_numero: z.number().int().positive(),
  codigo_oem_diagrama: z.string().min(1),
  codigo_oem_banco: z.string().min(1),
  peca_id: z.string().uuid().optional(),
  confianca: z.number().min(0).max(1).default(1),
});
