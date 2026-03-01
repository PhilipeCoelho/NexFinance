import { createClient } from '@supabase/supabase-js';

// URL e Chave fornecidas pelo utilizador para o novo projeto NexFinance
const fallbackUrl = 'https://gakhvpekdizhvywagvql.supabase.co';
const fallbackKey = 'sb_publishable_znsVVstaoqaCiKDuTaRl_A_m4AUij_u';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
