GRANT SELECT ON public.sistemas TO authenticated;
GRANT ALL ON public.sistemas TO service_role;
ALTER TABLE public.sistemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read sistemas" ON public.sistemas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage sistemas" ON public.sistemas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.recalcular_orcamento(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_recalcular_orcamento() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_calcular_subtotal_servico() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_calcular_subtotal_item() FROM anon, authenticated, public;