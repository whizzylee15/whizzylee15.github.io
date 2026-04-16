import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-key";

export const createClient = () =>
  createSupabaseClient(
    supabaseUrl!,
    supabaseKey!,
  );
