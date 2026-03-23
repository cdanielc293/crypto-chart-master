import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || 'http://127.0.0.1:8000';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpemlvbnhfbG9jYWwiLCJpYXQiOjE3NzQyODU1MTIsImV4cCI6MjA4OTY0NTUxMiwicm9sZSI6ImFub24ifQ.UuqmTgOaEWEpFxKiCIN8qCeviQOAbdzoQaHbs2uMM7Y';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
