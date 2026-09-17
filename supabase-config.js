const SUPABASE_URL =
  "https://qidaaofhfqliwtnqipkp.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "여기에_네_Publishable_key";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);