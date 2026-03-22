import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://vxiiygyszxhgeswwkpjd.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4aWl5Z3lzenhoZ2Vzd3drcGpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMjAxNDEsImV4cCI6MjA4OTY5NjE0MX0.TlG26FwEZeL_yWcnxEohyOPfMCtNnVUc4gCy93_N7L4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
