import { useCallback, useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { Ctx } from '../ctx'
import { api } from '../lib/api'
import { linkGoogle, signInWithGoogle } from '../lib/google'
import { supabase } from '../lib/supabase'
import type { Loc } from '../lib/types'
import { Btn, Loading, useBusy, useToast } from '../ui'

type Google = { google_email: string | null; updated_at: string } | null

const NAV = [
  { to: '/app', label: 'Overview', end: true },
  { to: '/app/seo', label: 'Profile SEO' },
  { to: '/app/reviews', label: 'Reviews' },
  { to: '/app/review-link', label: 'Review link' },
  { to: '/app/posts', label: 'Daily posts' },
  { to: '/app/photos', label: 'Photos' },
  { to: '/app/settings', label: 'Settings' },
]

export function Shell() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [google, setGoogle] = useState<Google>(null)
  const [locations, setLocations] = useState<Loc[]>([])
  const [locId, setLocIdState] = useState<string | null>(() => localStorage.getItem('loc'))
  const [ready, setReady] = useState(false)
  const toast = useToast()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const reload = useCallback(async () => {
    const [g, l] = await Promise.all([
      supabase.rpc('my_google_connection'),
      supabase.from('locations').select('*').order('title'),
    ])
    const row = Array.isArray(g.data) ? g.data[0] : g.data
    setGoogle((row as Google) ?? null)
    setLocations((l.data ?? []) as Loc[])
    setReady(true)
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (userId) void reload()
  }, [userId, reload])

  // Just signed in with Google: save its tokens, then fetch every Business Profile on that account.
  const providerRefresh = session?.provider_refresh_token
  useEffect(() => {
    if (!session || !providerRefresh) return
    if (sessionStorage.getItem('google-linked') === providerRefresh) return
    sessionStorage.setItem('google-linked', providerRefresh)
    linkGoogle(session)
      .then((count) => {
        toast(count ? `Google connected. ${count} business profile${count === 1 ? '' : 's'} added.` : 'Google connected, but no business profiles were found on this account.', count ? 'ok' : 'error')
        return reload()
      })
      .catch((e) => {
        sessionStorage.removeItem('google-linked')
        toast((e as Error).message, 'error')
        void reload()
      })
  }, [session, providerRefresh, toast, reload])

  // Back from the older Google connect flow: ?google=connected|denied|failed|no_refresh
  const g = params.get('google')
  useEffect(() => {
    if (!g || !userId) return
    setParams({}, { replace: true })
    if (g === 'connected') {
      api<{ count: number }>('/api/locations/sync')
        .then((r) => {
          toast(`Google connected. ${r.count} location${r.count === 1 ? '' : 's'} found.`)
          return reload()
        })
        .catch((e) => toast((e as Error).message, 'error'))
    } else if (g === 'denied') toast('Google access was cancelled.', 'error')
    else if (g === 'no_refresh') toast('Google did not give long-term access. Remove the app in your Google account permissions and connect again.', 'error')
    else toast('Could not connect Google. Try again.', 'error')
  }, [g, userId, setParams, toast, reload])

  const setLocId = (id: string) => {
    localStorage.setItem('loc', id)
    setLocIdState(id)
  }

  const patchLoc = async (patch: Partial<Loc>) => {
    const id = locations.find((l) => l.id === locId)?.id ?? locations[0]?.id
    if (!id) return
    const { error } = await supabase.from('locations').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
    setLocations((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  if (session === undefined) return <Loading />
  if (!session) return <Navigate to="/" replace />
  if (!ready) return <Loading />

  const loc = locations.find((l) => l.id === locId) ?? locations[0]

  if (!google || !loc) {
    return <Onboarding connected={!!google} email={session.user.email ?? ''} onDone={reload} />
  }

  return (
    <Ctx.Provider
      value={{ userId: session.user.id, email: session.user.email ?? '', google, locations, loc, setLocId, reload, patchLoc }}
    >
      <div className="shell">
        <aside className="rail">
          <a className="brand" href="/app">
            <span className="brand-mark" aria-hidden>D</span> Dukaan Board
          </a>
          <div className="loc-pick">
            <select aria-label="Business" value={loc.id} onChange={(e) => setLocId(e.target.value)}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>
          <nav className="nav" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="rail-foot">
            <span className="email">{session.user.email}</span>
            <Btn
              onClick={async () => {
                await supabase.auth.signOut()
                nav('/')
              }}
            >
              Sign out
            </Btn>
          </div>
        </aside>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </Ctx.Provider>
  )
}

function Onboarding({ connected, email, onDone }: { connected: boolean; email: string; onDone: () => Promise<void> }) {
  const { busy, run } = useBusy()
  const nav = useNavigate()
  return (
    <div className="onboard">
      <a className="brand" href="/app" style={{ color: 'var(--enamel)' }}>
        <span className="brand-mark" aria-hidden>D</span> Dukaan Board
      </a>
      {connected ? (
        <>
          <h1>No business found yet</h1>
          <p className="hint">
            Google is connected, but no Business Profile locations came back. Make sure the Google account you connected owns or manages
            the profile, then fetch again.
          </p>
          <div className="actions">
            <Btn
              kind="primary"
              busy={busy === 'sync'}
              onClick={() => run('sync', async () => { await api('/api/locations/sync'); await onDone() }, 'Locations updated')}
            >
              Fetch my locations
            </Btn>
            <Btn
              onClick={() => run('dc', async () => { await api('/api/google/disconnect'); await onDone() })}
              busy={busy === 'dc'}
            >
              Use another Google account
            </Btn>
          </div>
        </>
      ) : (
        <>
          <h1>Connect your Google Business Profile</h1>
          <p className="hint">
            Sign in with the Google account that manages your listing. We use it to read reviews and stats, and to post replies, updates
            and photos for you. You can disconnect any time.
          </p>
          <div className="actions">
            <Btn
              kind="primary"
              busy={busy === 'connect'}
              onClick={() => run('connect', signInWithGoogle)}
            >
              Continue with Google
            </Btn>
            <Btn onClick={async () => { await supabase.auth.signOut(); nav('/') }}>Sign out ({email})</Btn>
          </div>
        </>
      )}
    </div>
  )
}
