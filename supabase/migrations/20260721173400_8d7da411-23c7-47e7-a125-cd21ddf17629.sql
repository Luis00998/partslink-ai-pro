
-- Grants for PostgREST access (authenticated + service_role)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pecas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico_buscas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamento_itens TO authenticated;

GRANT ALL ON public.pecas TO service_role;
GRANT ALL ON public.historico_buscas TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.clientes TO service_role;
GRANT ALL ON public.fornecedores TO service_role;
GRANT ALL ON public.orcamentos TO service_role;
GRANT ALL ON public.orcamento_itens TO service_role;

-- Grant execute on has_role to authenticated (used by RLS-based checks in future)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Add image column to pecas
ALTER TABLE public.pecas ADD COLUMN IF NOT EXISTS imagem_url TEXT;

-- Fix profiles INSERT policy (needs WITH CHECK)
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Trigger on auth.users to create profile + admin role on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage RLS for pecas-imagens bucket (bucket itself created via tool)
DROP POLICY IF EXISTS "Users read own peca images" ON storage.objects;
CREATE POLICY "Users read own peca images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'pecas-imagens' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users upload own peca images" ON storage.objects;
CREATE POLICY "Users upload own peca images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pecas-imagens' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own peca images" ON storage.objects;
CREATE POLICY "Users update own peca images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'pecas-imagens' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own peca images" ON storage.objects;
CREATE POLICY "Users delete own peca images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pecas-imagens' AND (storage.foldername(name))[1] = auth.uid()::text);
