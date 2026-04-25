import { createClient } from "@supabase/supabase-js";

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const tries = 4;
  let lastErr: unknown = null;
  for (let i = 0; i < tries; i++) {
    try {
      return await fetch(input, init);
    } catch (e) {
      lastErr = e;
      // No artificial delays: immediate retries.
      if (i < tries - 1) await sleep(0);
    }
  }
  throw lastErr;
}

export function supabaseService() {
  return createClient(must("SUPABASE_URL"), must("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithRetry },
  });
}

export function supabaseAnon() {
  return createClient(must("SUPABASE_URL"), must("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithRetry },
  });
}

