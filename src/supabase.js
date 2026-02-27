import { createClient } from "@supabase/supabase-js";

// Uses Vite environment variables for Supabase Database + Storage
// We use a dummy valid URL as a fallback so the app doesn't crash with a white screen if .env is missing.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseKey);
