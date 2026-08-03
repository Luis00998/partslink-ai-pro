-- ============================================================================
-- STORAGE RLS POLICIES PARA DIAGRAMAS-IMAGENS
-- ============================================================================

-- Permitir usuários autenticados visualizarem imagens
CREATE POLICY "authenticated_can_read_diagram_images" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'diagramas-imagens');

-- Permitir admins fazer upload de imagens
CREATE POLICY "admins_can_upload_diagram_images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'diagramas-imagens' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Permitir admins atualizar imagens
CREATE POLICY "admins_can_update_diagram_images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'diagramas-imagens' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'diagramas-imagens' AND public.has_role(auth.uid(), 'admin'));

-- Permitir admins deletar imagens
CREATE POLICY "admins_can_delete_diagram_images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'diagramas-imagens' AND public.has_role(auth.uid(), 'admin'));