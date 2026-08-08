ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS cilindros text,
  ADD COLUMN IF NOT EXISTS tipo_veiculo text,
  ADD COLUMN IF NOT EXISTS dados_tecnicos jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS veiculos_vin_unique_idx ON public.veiculos (vin) WHERE vin IS NOT NULL;
CREATE INDEX IF NOT EXISTS veiculo_pecas_veiculo_idx ON public.veiculo_pecas (veiculo_id);
CREATE INDEX IF NOT EXISTS veiculo_pecas_peca_idx ON public.veiculo_pecas (peca_id);