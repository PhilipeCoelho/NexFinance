CREATE TABLE IF NOT EXISTS public.user_sync (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_sync ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can only select their own data" ON public.user_sync
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data" ON public.user_sync
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data" ON public.user_sync
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable Realtime
alter publication supabase_realtime add table public.user_sync;
