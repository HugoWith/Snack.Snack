import { createClient } from "@supabase/supabase-js";

// Auth only: the anon key is public, and the browser never reads the tables.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
