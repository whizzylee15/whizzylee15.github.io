import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder'));

if (!isSupabaseConfigured) {
  console.warn("Supabase URL or Anon Key is missing or using placeholders. Please check your environment variables.");
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
    }
  }
);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleSupabaseError(error: any, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error?.message || String(error),
    operationType,
    path,
    authInfo: {
      userId: null, // We'll fill this if needed, but Supabase handles auth differently
    }
  };
  
  const errorString = JSON.stringify(errInfo);
  console.error('Supabase Error: ', errorString);
  throw new Error(errorString);
}
