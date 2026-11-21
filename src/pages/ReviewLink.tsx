import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useApp } from '../ctx'
import { supabase } from '../lib/supabase'
import type { ReviewRequest } from '../lib/types'
import { daysAgo, num, shortDate } from '../lib/util'
import { Btn, Empty, Loading, PageHead, Stars, useBusy, useToast } from '../ui'

export function ReviewLink() {
  const { loc, patchLoc } = useApp()
  const { busy, run } = useBusy()
  const toast = useToast()
  const [reqs, setReqs] = useState<ReviewRequest[] | null>(null)
  const [qr, setQr] = useState('')
  const [slug, setSlug] = useState(loc.slug)

  const url = `${window.location.origin}/r/${loc.slug}`

  const load = useCallback(async () => {
    const { data } = await supabase.from('review_requests').select('*').eq('location_id', loc.id).order('created_at', { ascending: false }).limit(300)
    setReqs((data ?? []) as ReviewRequest[])
  }, [loc.id])

  useEffect(() => {
    setReqs(null)
    setSlug(loc.slug)
    void load()
  }, [load, loc.slug])

  useEffect(() => {
    QRCode.toDataURL(url, { width: 640, margin: 2, color: { dark: '#14305f', light: '#ffffff' } }).then(setQr).catch(() => setQr(''))
  }, [url])

  if (!reqs) return <Loading />

  const month = reqs.filter((r) => new Date(r.created_at) >= daysAgo(30))
  const copied = month.filter((r) => r.copied_at).length
  const opened = month.filter((r) => r.opened_at).length

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast('Link copied')
    } catch {
      toast('Could not copy. Select the link and copy it by hand.', 'error')
    }
  }

  const saveSlug = async () => {
    const s = slug.trim().toLowerCase()
    if (!/^[a-z0-9-]{3,50}$/.test(s)) throw new Error('Use 3 to 50 letters, numbers or dashes.')
    if (s === loc.slug) return
    try {
      await patchLoc({ slug: s })
    } catch {
      throw new Error('That name is taken. Try another.')
    }
  }

  return (
    <>
      <PageHead title="Review link" hint="Give customers this link or QR. They tap a star rating, pick what they liked, and get a review written for them to copy to Google in one tap." />

      <div className="panel qr-box">
        {qr ? <img src={qr} alt={`QR code for ${url}`} /> : <div style={{ width: 168, height: 168 }} />}
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="url-line">
            <input type="text" readOnly value={url} aria-label="Review link" onFocus={(e) => e.currentTarget.select()} />
            <Btn kind="primary" onClick={copy}>Copy</Btn>
          </div>
          <div className="actions">
            <a className="btn ghost" href={qr} download={`${loc.slug}-review-qr.png`}>Download QR</a>
            <a className="btn ghost" href={url} target="_blank" rel="noreferrer">Try it yourself</a>
          </div>
          <form
            className="url-line"
            onSubmit={(e) => { e.preventDefault(); void run('slug', saveSlug, 'Link changed. Reprint any old QR codes.') }}
          >
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} aria-label="Link name" />
            <Btn type="submit" busy={busy === 'slug'} disabled={slug === loc.slug}>Change name</Btn>
          </form>
          <p className="help">Changing the name breaks links and QR codes you already shared.</p>
        </div>
      </div>

      <section className="section">
        <h2>Last 30 days</h2>
        <div className="stats">
          <div className="stat"><div className="label">Reviews written for customers</div><div className="value">{num(month.length)}</div></div>
          <div className="stat"><div className="label">Copied</div><div className="value">{num(copied)}</div></div>
          <div className="stat"><div className="label">Opened Google</div><div className="value">{num(opened)}</div></div>
        </div>
      </section>

      <section className="section">
        <h2>Recent</h2>
        {reqs.length === 0 ? (
          <Empty title="Nobody has used the link yet">Print the QR near the counter, or send the link on WhatsApp after a visit.</Empty>
        ) : (
          <div className="list">
            {reqs.slice(0, 8).map((r) => (
              <div className="row" key={r.id}>
                <div className="row-top"><Stars n={r.rating} /><span className="meta">{shortDate(r.created_at)} · {r.opened_at ? 'went to Google' : r.copied_at ? 'copied' : 'not copied'}</span></div>
                <div className="quote">{r.generated_text}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
