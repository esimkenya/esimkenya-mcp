import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Env } from './types.js'

let cached: { client: SupabaseClient; url: string } | null = null

export function getSupabase(env: Env): SupabaseClient {
  if (cached?.url === env.SUPABASE_URL) return cached.client
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })
  cached = { client, url: env.SUPABASE_URL }
  return client
}
