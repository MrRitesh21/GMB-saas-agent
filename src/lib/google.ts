import type { Session } from '@supabase/supabase-js'
import { api } from './api'
import { SUPABASE_URL, supabase } from './supabase'

const GBP_SCOPE = 'https://www.googleapis.com/auth/business.manage'

// Google login that also asks for Business Profile access.
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/app`,
      scopes: GBP_SCOPE,
      queryParams: { access_type: 'offline', prompt: 'consent select_account' },
    },
  })
  if (error) throw new Error(error.message)
}

// Right after Google login the session carries Google's tokens. Save them, then pull every profile.
export async function linkGoogle(session: Session): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/gmb-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({
      provider_token: session.provider_token ?? null,
      provider_refresh_token: session.provider_refresh_token ?? null,
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error ?? `Could not save Google connection (${res.status})`)
  const sync = await api<{ count: number }>('/api/locations/sync')
  return sync.count
}
