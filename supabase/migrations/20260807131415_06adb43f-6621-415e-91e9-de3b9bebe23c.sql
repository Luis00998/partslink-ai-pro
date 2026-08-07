CREATE OR REPLACE FUNCTION public.obter_veiculo_por_vin(p_vin text)
RETURNS SETOF public.veiculos
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.veiculos SET ultimo_acesso = now()
   WHERE vin IS NOT NULL AND upper(vin) = upper(trim(p_vin));
  RETURN QUERY
    SELECT * FROM public.veiculos
     WHERE vin IS NOT NULL AND upper(vin) = upper(trim(p_vin))
     LIMIT 1;
END; $$;

REVOKE ALL ON FUNCTION public.obter_veiculo_por_vin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obter_veiculo_por_vin(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.obter_pecas_do_veiculo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obter_pecas_do_veiculo(uuid) TO authenticated, service_role;