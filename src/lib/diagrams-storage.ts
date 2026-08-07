/**
 * Utilidades para gerenciar armazenamento de imagens de diagramas
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BUCKET_NAME = "diagramas-imagens";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadDiagramImageResult {
  path: string;
  url: string;
  size: number;
  type: string;
  hash: string;
}

/**
 * Calcular hash SHA256 de um arquivo
 */
async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Fazer upload de imagem do diagrama
 */
export async function uploadDiagramImage(
  supabase: SupabaseClient<Database>,
  file: File,
  diagramaId: string,
): Promise<UploadDiagramImageResult> {
  // Validações
  if (!file) throw new Error("Arquivo obrigatório");
  if (file.size > MAX_FILE_SIZE) throw new Error(`Arquivo deve ser menor que 10MB`);
  if (!file.type.startsWith("image/")) throw new Error("Arquivo deve ser uma imagem");

  const hash = await calculateFileHash(file);
  const timestamp = Date.now();
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${diagramaId}/${timestamp}.${ext}`;

  console.log(`[Storage] uploading diagrama image: ${filename}`);

  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filename, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw new Error(`Erro no upload: ${error.message}`);

  // Obter URL pública
  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

  return {
    path: data.path,
    url: urlData.publicUrl,
    size: file.size,
    type: file.type,
    hash,
  };
}

/**
 * Deletar imagem de diagrama
 */
export async function deleteDiagramImage(
  supabase: SupabaseClient<Database>,
  imagemPath: string,
): Promise<void> {
  console.log(`[Storage] deleting diagrama image: ${imagemPath}`);

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([imagemPath]);

  if (error) throw new Error(`Erro ao deletar imagem: ${error.message}`);
}

/**
 * Obter URL pública de uma imagem de diagrama
 */
export function getDiagramImageUrl(imagemPath: string): string {
  const { VITE_SUPABASE_URL } = import.meta.env;
  return `${VITE_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${imagemPath}`;
}

/**
 * Listar imagens de um diagrama
 */
export async function listDiagramImages(
  supabase: SupabaseClient<Database>,
  diagramaId: string,
): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(diagramaId);

  if (error) {
    console.error(`Erro ao listar imagens: ${error.message}`);
    return [];
  }

  return (data || []).filter((f) => f.name !== ".emptyFolderPlaceholder").map((f) => f.name);
}
