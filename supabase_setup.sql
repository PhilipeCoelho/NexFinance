-- ============================================================
-- NexFinance - Setup da Tabela de Sincronização e Segurança
-- Execute este SQL no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/gakhvpekdizihywagyql/sql/new
-- ============================================================

-- 1. Criar tabela user_sync
CREATE TABLE IF NOT EXISTS public.user_sync (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state   JSONB        NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Ativar Row Level Security para user_sync
ALTER TABLE public.user_sync ENABLE ROW LEVEL SECURITY;

-- 3. Cada utilizador só pode gerir os seus próprios dados de sincronização
DROP POLICY IF EXISTS "Users can manage their own sync data" ON public.user_sync;
CREATE POLICY "Users can manage their own sync data"
  ON public.user_sync
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Dar permissão a utilizadores autenticados para user_sync
GRANT ALL ON public.user_sync TO authenticated;

-- ============================================================
-- SEGURANÇA: Corrigir tabelas públicas sem RLS
-- ============================================================

-- 5. Ativar RLS nas tabelas públicas se existirem
-- (Resolve os erros de segurança rls_disabled_in_public)
DO $$
BEGIN
    -- Enable RLS for accounts
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'accounts') THEN
        ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
        
        -- Adicionar política de segurança básica se houver coluna user_id
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'user_id') THEN
            DROP POLICY IF EXISTS "Users can manage their own accounts" ON public.accounts;
            CREATE POLICY "Users can manage their own accounts" ON public.accounts FOR ALL USING (auth.uid() = user_id);
        END IF;
    END IF;

    -- Enable RLS for transactions
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions') THEN
        ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
        
        -- Adicionar política de segurança básica se houver coluna user_id
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'user_id') THEN
            DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
            CREATE POLICY "Users can manage their own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);
        END IF;
    END IF;
END $$;

-- Verificar criação
SELECT 'Tabela user_sync configurada e RLS ativado em accounts e transactions!' as resultado;

