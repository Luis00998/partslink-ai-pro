ALTER TABLE public.pecas
  ADD COLUMN IF NOT EXISTS fonte_url text,
  ADD COLUMN IF NOT EXISTS fonte_confianca text,
  ADD COLUMN IF NOT EXISTS importado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS importado_em timestamptz;