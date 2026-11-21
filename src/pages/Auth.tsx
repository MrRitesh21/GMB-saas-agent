import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithGoogle } from '../lib/google'
import { supabase } from '../lib/supabase'
import { Btn } from '../ui'

export function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('up')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null)
  const nav = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav('/app', { replace: true })
    })
  }, [nav])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (mode === 'up') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.session) nav('/app')
        else setMsg({ kind: 'ok', text: 'Check your email and tap the confirmation link, then sign in.' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        nav('/app')
      }
    } catch (err) {
      setMsg({ kind: 'err', text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="landing">
      <div className="left">
        <span className="sign">Dukaan Board</span>
        <h1>Your Google listing, kept busy while you run the shop.</h1>
        <p className="lede">
          One tool for the six things that move you up in local search: a sharper profile, more reviews, replies to every review, a post every
          day, a steady flow of photos, and numbers you can read.
        </p>
        <ul className="feats">
          <li>Profile rewrite built on keywords people really search</li>
          <li>One link and QR that helps customers post a review in one tap</li>
          <li>Replies to every review, in the reviewer's language</li>
          <li>Daily posts and photos on a schedule you set</li>
        </ul>
        <form className="auth-card" onSubmit={submit}>
          <h2>{mode === 'up' ? 'Create your account' : 'Welcome back'}</h2>
          <Btn
            kind="sun"
            type="button"
            busy={googleBusy}
            onClick={async () => {
              setGoogleBusy(true)
              setMsg(null)
              try {
                await signInWithGoogle()
              } catch (err) {
                setMsg({ kind: 'err', text: (err as Error).message })
                setGoogleBusy(false)
              }
            }}
          >
            Continue with Google
          </Btn>
          <p className="help" style={{ marginTop: -6 }}>
            Use the Google account that manages your business. We will find all its Business Profiles.
          </p>
          <p className="help" style={{ textAlign: 'center' }}>or use email</p>
          <label className="field">
            Email
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === 'up' ? <span className="help">At least 8 characters.</span> : null}
          </label>
          {msg ? <p className={msg.kind === 'err' ? 'err' : 'help'}>{msg.text}</p> : null}
          <Btn kind="primary" type="submit" busy={busy}>
            {mode === 'up' ? 'Create account' : 'Sign in'}
          </Btn>
          <p className="help">
            {mode === 'up' ? 'Already have an account? ' : 'New here? '}
            <button type="button" className="switch" onClick={() => { setMode(mode === 'up' ? 'in' : 'up'); setMsg(null) }}>
              {mode === 'up' ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </form>
      </div>
      <div className="right" aria-hidden>
        <div className="phone">
          <div>
            <h3>Sharma Dental Clinic</h3>
            <p className="mini">Lucknow · takes 20 seconds</p>
          </div>
          <div className="star-row">★★★★★</div>
          <div className="chips" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="on">Gentle doctor</span>
            <span className="on">Root canal</span>
            <span>Clean clinic</span>
            <span>Fair price</span>
          </div>
          <div className="review-text">
            Had a root canal here and the doctor was very gentle and explained everything. Best dentist in Lucknow I have visited.
          </div>
          <div className="go">Copy and open Google</div>
        </div>
      </div>
    </div>
  )
}
