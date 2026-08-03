// Tipos TypeScript para o sistema de diagramas explodidos

export interface Sistema {
  id: string;
  nome: string;
  ordem: number;
  descricao: string | null;
  icone: string | null;
  created_at: string;
}

export interface DiagramaCatalogo {
  id: string;
  marca_veiculo: string;
  modelo_veiculo: string;
  ano_veiculo: number | null;
  motor_veiculo: string | null;
  versao_veiculo: string | null;
  chassis_veiculo: string | null;
  vin_veiculo: string | null;
  sistema_id: string;
  nome_diagrama: string;
  descricao: string | null;
  imagem_url: string;
  imagem_bucket: string;
  imagem_path: string | null;
  imagem_tamanho: number | null;
  imagem_tipo: string | null;
  total_itens: number;
  total_pecas_unicas: number;
  ativo: boolean;
  importado_em: string;
  ultima_atualizacao: string;
  owner_id: string;
  origem_import: string | null;
  fonte_url: string | null;
  hash_imagem: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiagramaItem {
  id: string;
  diagrama_id: string;
  peca_id: string | null;
  numero_referencia: number;
  posicao_x: number;
  posicao_y: number;
  raio_hotspot: number;
  codigo_oem_diagrama: string | null;
  codigo_interno_diagrama: string | null;
  descricao_diagrama: string;
  marca_diagrama: string | null;
  fabricante_diagrama: string | null;
  quantidade: number;
  unidade: string;
  aplicacoes: string | null;
  motores_aplicaveis: string | null;
  chassis_aplicaveis: string | null;
  observacoes: string | null;
  posicao_montagem: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface DiagramaMapeamentoOEM {
  id: string;
  diagrama_id: string;
  item_numero: number;
  codigo_oem_diagrama: string;
  codigo_oem_banco: string;
  peca_id: string | null;
  mapeado_automaticamente: boolean;
  mapeado_em: string;
  mapeado_por: string | null;
  confianca: number;
  created_at: string;
}

export interface DiagramaHistorico {
  id: string;
  diagrama_id: string;
  tipo_alteracao: string;
  descricao: string | null;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  usuario_id: string;
  criado_em: string;
}

export interface DiagramaComPecas extends DiagramaItem {
  peca_id: string | null;
  codigo_original: string | null;
  codigo_interno: string | null;
  descricao_peca: string | null;
  marca_peca: string | null;
  equivalencias: unknown[] | null;
}

export interface DiagramasVeiculoResult {
  diagrama_id: string;
  sistema_nome: string;
  nome_diagrama: string;
  imagem_url: string;
  total_itens: number;
  marca_veiculo: string;
  modelo_veiculo: string;
  ano_veiculo: number | null;
  motor_veiculo: string | null;
}

export interface OEMDiagramasCount {
  total_diagramas: number;
  total_ocorrencias: number;
  lista_marcas: string[];
  lista_modelos: string[];
}

// DTOs para criação/atualização
export interface CreateDiagramaCatalogoInput {
  marca_veiculo: string;
  modelo_veiculo: string;
  ano_veiculo?: number;
  motor_veiculo?: string;
  versao_veiculo?: string;
  chassis_veiculo?: string;
  vin_veiculo?: string;
  sistema_id: string;
  nome_diagrama: string;
  descricao?: string;
  imagem_url: string;
  imagem_path?: string;
  imagem_tamanho?: number;
  imagem_tipo?: string;
  origem_import?: string;
  fonte_url?: string;
  hash_imagem?: string;
}

export interface CreateDiagramaItemInput {
  diagrama_id: string;
  numero_referencia: number;
  posicao_x: number;
  posicao_y: number;
  raio_hotspot?: number;
  codigo_oem_diagrama?: string;
  codigo_interno_diagrama?: string;
  descricao_diagrama: string;
  marca_diagrama?: string;
  fabricante_diagrama?: string;
  quantidade?: number;
  unidade?: string;
  aplicacoes?: string;
  motores_aplicaveis?: string;
  chassis_aplicaveis?: string;
  observacoes?: string;
  posicao_montagem?: string;
  peca_id?: string;
}

export interface UpdateDiagramaCatalogoInput {
  nome_diagrama?: string;
  descricao?: string;
  imagem_url?: string;
  ativo?: boolean;
  total_itens?: number;
  total_pecas_unicas?: number;
  ultima_atualizacao?: string;
}

export interface UpdateDiagramaItemInput {
  numero_referencia?: number;
  posicao_x?: number;
  posicao_y?: number;
  raio_hotspot?: number;
  codigo_oem_diagrama?: string;
  descricao_diagrama?: string;
  quantidade?: number;
  peca_id?: string;
}

// Respostas de API
export interface BulkImportDiagramasResult {
  total_processados: number;
  criados: number;
  atualizados: number;
  erros: Array<{
    linha: number;
    erro: string;
    dados: string;
  }>;
}

export interface MapeamentoAutomaticoResult {
  total_itens: number;
  mapeados: number;
  nao_mapeados: number;
  detalhes: Array<{
    item_numero: number;
    codigo_oem: string;
    peca_encontrada: boolean;
    confianca: number;
  }>;
}
