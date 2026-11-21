import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../ctx'
import { api } from '../lib/api'
import { signInWithGoogle } from '../lib/google'
import { supabase } from '../lib/supabase'
import type { Loc } from '../lib/types'
import { hourLabel, shortDate, TIMEZONES } from '../lib/util'
import { Btn, PageHead, Toggle, useBusy } from '../ui'

export function Settings() {
  const { loc, patchLoc, google, reload } = useApp()
  const { busy, run } = useBusy()
  const nav = useNavigate()
  const [f, setF] = useState({
    primary_category: loc.primary_category ?? '',
    city: loc.city ?? '',
    services: (loc.services ?? []).join(', '),
    brand_voice: loc.brand_voice,
    language: loc.language,
    timezone: loc.timezone,
    post_hour: loc.post_hour,
  })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }))

  const save = () =>
    run('save', () => {
      const patch: Partial<Loc> = {
        primary_category: f.primary_category.trim() || null,
        city: f.city.trim() || null,
        services: f.services.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30),
        brand_voice: f.brand_voice.trim() || 'warm, friendly and professional',
        language: f.language,
        timezone: f.timezone,
        post_hour: f.post_hour,
      }
      return patchLoc(patch)
    }, 'Saved')

  return (
    <>
      <PageHead title="Settings" hint="The agent uses these details in every description, reply, post and review. The more exact they are, the better the writing." />

      <form className="panel" onSubmit={(e) => { e.preventDefault(); void save() }}>
        <div className="form-grid">
          <label className="field">What kind of business is it?
            <input type="text" value={f.primary_category} onChange={(e) => set('primary_category', e.target.value)} placeholder="Dental clinic" />
          </label>
          <label className="field">City or area
            <input type="text" value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="Gomti Nagar, Lucknow" />
          </label>
          <label className="field wide">Services you want to be found for
            <textarea rows={3} value={f.services} onChange={(e) => set('services', e.target.value)} placeholder="Root canal, teeth whitening, braces, kids dentistry" />
            <span className="help">Separate with commas.</span>
          </label>
          <label className="field wide">How should we sound?
            <input type="text" value={f.brand_voice} onChange={(e) => set('brand_voice', e.target.value)} />
          </label>
          <label className="field">Main language
            <select value={f.language} onChange={(e) => set('language', e.target.value)}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
            <span className="help">Review replies follow each reviewer's language.</span>
          </label>
          <label className="field">Time zone
            <select value={f.timezone} onChange={(e) => set('timezone', e.target.value)}>
              {TIMEZONES.includes(f.timezone) ? null : <option>{f.timezone}</option>}
              {TIMEZONES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="field">Post time
            <select value={f.post_hour} onChange={(e) => set('post_hour', Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
          </label>
        </div>
        <div className="actions" style={{ marginTop: 16 }}>
          <Btn kind="primary" type="submit" busy={busy === 'save'}>Save changes</Btn>
        </div>
      </form>

      <section className="section">
        <h2>Automation</h2>
        <div className="panel" style={{ display: 'grid', gap: 14 }}>
          <Toggle checked={loc.auto_posts} label="Write and publish a daily post" onChange={(v) => void run('ap', () => patchLoc({ auto_posts: v }), 'Saved')} />
          <Toggle checked={loc.auto_photos} label="Schedule uploaded photos automatically" onChange={(v) => void run('aph', () => patchLoc({ auto_photos: v }), 'Saved')} />
        </div>
      </section>

      <section className="section">
        <h2>Google account</h2>
        <div className="panel" style={{ display: 'grid', gap: 12 }}>
          <p>Connected as <strong>{google?.google_email ?? 'your Google account'}</strong>{google ? ` since ${shortDate(google.updated_at)}` : ''}.</p>
          <div className="actions">
            <Btn busy={busy === 'sync'} onClick={() => run('sync', async () => { const r = await api<{ count: number }>('/api/locations/sync'); await reload(); return r }, 'Locations updated')}>
              Fetch locations again
            </Btn>
            <Btn
              busy={busy === 'again'}
              onClick={() => run('again', signInWithGoogle)}
            >
              Reconnect Google
            </Btn>
            <Btn
              kind="danger"
              busy={busy === 'dc'}
              onClick={() => {
                if (!window.confirm('Disconnect Google? Replies, posts and photos will stop until you connect again.')) return
                void run('dc', async () => { await api('/api/google/disconnect'); await reload() })
              }}
            >
              Disconnect
            </Btn>
          </div>
        </div>
      </section>

      <section className="section">
        <Btn onClick={async () => { await supabase.auth.signOut(); nav('/') }}>Sign out</Btn>
      </section>
    </>
  )
}
