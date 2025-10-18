import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase config:', { 
  url: supabaseUrl, 
  hasKey: !!supabaseKey,
  keyLength: supabaseKey?.length 
});

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
