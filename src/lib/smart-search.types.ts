export type SmartCandidate = {
  codigo_original: string | null;
  codigo_interno: string | null;
  descricao: string;
  fabricante: string | null;
  categoria: string | null;
  aplicacao: string | null;
  fonte_url: string;
  fonte_nome: string;
  fonte_confianca: "alta" | "media" | "baixa";
  justificativa?: string;
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