import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishable){
    throw new Error('VITE_SUPABASE_URL atau VITE_SUPABASE_PUBLISHABLE_KEY belum diisi di file .env.local')
}

export const supabase = createClient(supabaseUrl, supabasePublishable)