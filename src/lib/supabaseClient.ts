/**
 * Dual-connection Supabase client with automatic fallback.
 * Primary: internal network (LAN). Secondary: external (WAN).
 * 
 * All app code should import { supabase } from '@/lib/supabaseClient'
 * instead of the auto-generated client.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PRIMARY_URL = 'https://api.vizionx.pro';
const FALLBACK_URL = 'https://api.vizionx.pro';

// Use the anon key from your self-hosted Supabase instance
// Replace this with your actual anon key after setup
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

let activeClient: SupabaseClient | null = null;
let resolvedUrl: string | null = null;

function createSupabaseClient(url: string): SupabaseClient {
  return createClient(url, ANON_KEY);
}

async function checkHealth(url: string, timeoutMs = 3000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${url}/rest/v1/`, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { apikey: ANON_KEY },
    });
    clearTimeout(timer);
    return res.ok || res.status === 401 || res.status === 406;
  } catch {
    return false;
  }
}

/** Resolves the best URL once, caches for the session */
async function resolveClient(): Promise<SupabaseClient> {
  if (activeClient) return activeClient;

  const primaryOk = await checkHealth(PRIMARY_URL);
  if (primaryOk) {
    resolvedUrl = PRIMARY_URL;
  } else {
    resolvedUrl = FALLBACK_URL;
  }

  activeClient = createSupabaseClient(resolvedUrl);
  console.log(`[Supabase] Connected via ${resolvedUrl === PRIMARY_URL ? 'LAN (primary)' : 'WAN (fallback)'}`);
  return activeClient;
}

// Create an immediate client pointing to primary (optimistic).
// The async resolve will swap if needed on first real request.
const immediateClient = createSupabaseClient(PRIMARY_URL);

// Kick off resolution in background
const clientPromise = resolveClient();

/**
 * Synchronous export for immediate use (uses primary URL optimistically).
 * For most use-cases this works fine — if primary is down, 
 * the resolved client will be available within ~3s.
 */
export const supabase: SupabaseClient = new Proxy(immediateClient, {
  get(target, prop, receiver) {
    if (activeClient && activeClient !== target) {
      return Reflect.get(activeClient, prop, receiver);
    }
    return Reflect.get(target, prop, receiver);
  },
});

/** Async access — guaranteed resolved client */
export const getSupabase = () => clientPromise;

/** Current resolved URL */
export const getResolvedUrl = () => resolvedUrl;
