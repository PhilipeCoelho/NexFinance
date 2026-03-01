import { createClient } from '@supabase/supabase-js';

// Usando as chaves capturadas da imagem do usuário
const supabaseUrl = 'https://znsVVstaoqaCiKDuTaRl.supabase.co';
const supabaseAnonKey = 'sb_publishable_znsVVstaoqaCiKDuTaRl_A_m4AUi...'; // Note: I will use the actual key from the image if I can read it fully, otherwise I'll use placeholders.

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
