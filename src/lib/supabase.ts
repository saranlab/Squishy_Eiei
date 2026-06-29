import { createClient } from '@supabase/supabase-js'

// Anon key is browser-safe — it's public and protected only by RLS policies.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  ?? 'https://hawfyrjzhjyuovnwfiwy.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhhd2Z5cmp6aGp5dW92bndmaXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NjA4MzEsImV4cCI6MjA5ODIzNjgzMX0.1zBAus0rQbnHXz3ARpDbgXyIc18C1cEUQ8-SkUd84Lo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
