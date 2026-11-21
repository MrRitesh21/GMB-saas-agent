import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, useBusy } from '../ui'

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 40).replace(/^-+|-+$/g, '') || 'biz'

// Far-future stamp keeps the 15-minute job from calling Google for a business that is not linked yet.
const PARKED = '2100-01-01T00:00:00Z'

export function ManualAdd({ userId, onDone }: { userId: string; onDone: () => Promise<void> }) {
  const { busy, run } = useBusy()
  const [f, setF] = useState({ title: '', city: '', category: '', placeId: '', services: '' })
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void run('add', async () => {
      const title = f.title.trim()
      const placeId = f.placeId.trim()
      if (!title) throw new Error('Enter the business name.')
      if (placeId && !/^[A-Za-z0-9_-]{20,}$/.test(placeId)) throw new Error('That Place ID does not look right. It starts with ChIJ and has no spaces.')
      const { error } = await supabase.from('locations').insert({
        user_id: userId,
        google_account: 'manual',
        google_location: `manual/${crypto.randomUUID()}`,
        title,
        city: f.city.trim() || null,
        primary_category: f.category.trim() || null,
        place_id: placeId || null,
        services: f.services.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30),
        slug: `${slugify(title)}-${crypto.randomUUID().slice(0, 4)}`,
        review_mode: 'off',
        auto_posts: false,
        auto_photos: false,
        last_metrics_at: PARKED,
      })
      if (error) throw new Error(error.message)
      await onDone()
    }, 'Business added')
  }

  return (
    <form className="panel" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
      <div>
        <h2>Add your business by hand</h2>
        <p className="hint">
          Start with the review link and QR now. Replies, posts, photos and stats begin once Google approves access and you connect.
        </p>
      </div>
      <div className="form-grid">
        <label className="field wide">Business name
          <input type="text" required value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Sharma Dental Clinic" />
        </label>
        <label className="field">City or area
          <input type="text" value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="Gomti Nagar, Lucknow" />
        </label>
        <label className="field">What kind of business?
          <input type="text" value={f.category} onChange={(e) => set('category', e.target.value)} placeholder="Dental clinic" />
        </label>
        <label className="field wide">Services
          <input type="text" value={f.services} onChange={(e) => set('services', e.target.value)} placeholder="Root canal, teeth whitening, braces" />
          <span className="help">Separate with commas. Customers pick from these on the review page.</span>
        </label>
        <label className="field wide">Google Place ID
          <input type="text" value={f.placeId} onChange={(e) => set('placeId', e.target.value.trim())} placeholder="ChIJ..." />
          <span className="help">
            Makes the link open your exact review box on Google. Find it with the{' '}
            <a href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder" target="_blank" rel="noreferrer">Place ID finder</a>.
            Without it, the link opens a Google Maps search for your business.
          </span>
        </label>
      </div>
      <div className="actions">
        <Btn kind="sun" type="submit" busy={busy === 'add'}>Add business</Btn>
      </div>
    </form>
  )
}
