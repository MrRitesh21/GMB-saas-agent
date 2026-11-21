import { FN_URL, supabase } from './supabase'

async function parse(res: Response) {
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`)
  return json
}

// Signed-in calls to the gmb edge function.
export async function api<T = any>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Please sign in again')
  const res = await fetch(`${FN_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  return parse(res)
}

// Public review-link calls. No login.
export const pub = {
  info: (slug: string) => fetch(`${FN_URL}/public/location/${slug}`).then(parse) as Promise<{
    title: string
    city: string | null
    services: string[]
    language: string
  }>,
  generate: (slug: string, body: { rating: number; highlights: string[]; language: string }) =>
    fetch(`${FN_URL}/public/review/${slug}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(parse) as Promise<{ request_id: string; text: string; google_url: string }>,
  event: (request_id: string, event: 'copied' | 'opened') =>
    fetch(`${FN_URL}/public/review/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id, event }),
    }).catch(() => null),
}
