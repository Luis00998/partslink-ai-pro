export type SmartCandidate = {
  codigo_original: string | null;
  codigo_interno: string | null;
  codigo_paralelo?: string | null;
  descricao: string;
  marca?: string | null;
  fabricante: string | null;
  categoria: string | null;
  subcategoria?: string | null;
  aplicacao: string | null;
  motores_compativeis?: string | null;
  chassis_compativeis?: string | null;
  ano_inicial?: number | null;
  ano_final?: number | null;
  observacoes?: string | null;
  equivalencias?: any[] | null;
  fonte_url: string;
  fonte_nome: string;
  fonte_confianca: "alta" | "media" | "baixa";
  justificativa?: string;
  torque?: string | null;
  quantidade_por_veiculo?: string | null;
  tipo_oleo?: string | null;
  quantidade_oleo?: string | null;
  liquido_arrefecimento?: string | null;
  ferramentas_necessarias?: string | null;
  tempo_estimado?: string | null;
  procedimentos_tecnicos?: string | null;
  imagem_url?: string | null;
  imagens_adicionais?: string[] | null;
};

export type SmartSearchResult = {
  encontrado: boolean;
  candidatos: SmartCandidate[];
  fontes_consultadas: Array<{ url: string; title: string }>;
  termo: string;
};

export type PublicSource = {
  url: string;
  title: string;
  description: string;
  markdown: string;
};