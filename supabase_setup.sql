-- ============================================================
-- NexFinance - Setup da Tabela de Sincronização
-- Execute este SQL no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/gakhvpekdizihywagyql/sql/new
-- ============================================================

-- 1. Criar tabela user_sync
CREATE TABLE IF NOT EXISTS public.user_sync (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state   JSONB        NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Activar Row Level Security
ALTER TABLE public.user_sync ENABLE ROW LEVEL SECURITY;

-- 3. Cada utilizador só pode ler/escrever os seus próprios dados
DROP POLICY IF EXISTS "Users can manage their own sync data" ON public.user_sync;
CREATE POLICY "Users can manage their own sync data"
  ON public.user_sync
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Dar permissão a utilizadores autenticados
GRANT ALL ON public.user_sync TO authenticated;

-- Verificar criação
SELECT 'Tabela user_sync criada com sucesso!' as resultado;
