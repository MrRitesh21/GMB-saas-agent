import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { pub } from '../lib/api'
import { Btn, Loading } from '../ui'

type Info = Awaited<ReturnType<typeof pub.info>>
type Result = { request_id: string; text: string; google_url: string }

const GENERIC = ['Friendly staff', 'Quick service', 'Clean place', 'Fair price', 'Would come again']
const LANGS = [
  { v: 'en', label: 'English' },
  { v: 'hinglish', label: 'Hinglish' },
  { v: 'hi', label: 'हिन्दी' },
]

export function PublicReview() {
  const { slug = '' } = useParams()
  const [info, setInfo] = useState<Info | null>(null)
  const [missing, setMissing] = useState(false)
  const [rating, setRating] = useState(0)
  const [picked, setPicked] = useState<string[]>([])
  const [lang, setLang] = useState('en')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [res, setRes] = useState<Result | null>(null)
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    pub.info(slug).then((i) => { setInfo(i); setLang(i.language === 'hi' ? 'hi' : 'en') }).catch(() => setMissing(true))
  }, [slug])

  if (missing) {
    return (
      <div className="pr"><div className="pr-card"><h1>Link not found</h1><p className="sub">Please ask the business for a new link.</p></div></div>
    )
  }
  if (!info) return <div className="pr"><div className="pr-card"><Loading /></div></div>

  const options = [...new Set([...info.services.slice(0, 5), ...GENERIC])].slice(0, 9)
  const toggle = (h: string) => setPicked((p) => (p.includes(h) ? p.filter((x) => x !== h) : p.length >= 5 ? p : [...p, h]))

  const generate = async () => {
    setBusy(true)
    setErr('')
    try {
      const r = await pub.generate(slug, { rating, highlights: picked, language: lang })
      setRes(r)
      setText(r.text)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Open Google first (needs the tap), then copy.
  const go = () => {
    if (!res) return
    window.open(res.google_url, '_blank', 'noopener')
    void navigator.clipboard?.writeText(text).catch(() => null)
    void pub.event(res.request_id, 'copied')
    void pub.event(res.request_id, 'opened')
    setDone(true)
  }

  return (
    <div className="pr">
      <div className="pr-card">
        <div>
          <h1>{info.title}</h1>
          <p className="sub">{info.city ? `${info.city} · ` : ''}Tell us how it went. Takes about 20 seconds.</p>
        </div>

        {!res ? (
          <>
            <div>
              <h3 style={{ marginBottom: 10 }}>How was your visit?</h3>
              <div className="star-pick" role="group" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" className={n <= rating ? 'on' : ''} aria-label={`${n} star${n === 1 ? '' : 's'}`} aria-pressed={n === rating} onClick={() => setRating(n)}>★</button>
                ))}
              </div>
            </div>
            {rating > 0 ? (
              <>
                <div>
                  <h3 style={{ marginBottom: 10 }}>What stood out? <span className="help">Pick up to 5</span></h3>
                  <div className="hl">
                    {options.map((h) => <button key={h} type="button" aria-pressed={picked.includes(h)} onClick={() => toggle(h)}>{h}</button>)}
                  </div>
                </div>
                <div className="pr-lang" role="group" aria-label="Language">
                  {LANGS.map((l) => (
                    <button key={l.v} type="button" className="btn ghost small" aria-pressed={lang === l.v} style={lang === l.v ? { background: 'var(--enamel)', color: '#fff', borderColor: 'var(--enamel)' } : undefined} onClick={() => setLang(l.v)}>{l.label}</button>
                  ))}
                </div>
                {err ? <p className="err">{err}</p> : null}
                <Btn kind="sun" className="big-go" busy={busy} onClick={generate}>Write my review</Btn>
              </>
            ) : null}
          </>
        ) : (
          <>
            <div>
              <h3 style={{ marginBottom: 8 }}>Your review</h3>
              <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} aria-label="Your review" style={{ fontSize: '1.05rem' }} />
              <p className="help" style={{ marginTop: 6 }}>Change anything so it sounds like you. Only post what is true.</p>
            </div>
            {err ? <p className="err">{err}</p> : null}
            <Btn kind="sun" className="big-go" onClick={go}>Copy and open Google</Btn>
            <p className="steps-note">
              {done
                ? 'Your review is copied. On Google, press and hold in the box, tap Paste, then Post.'
                : 'We copy the text, then open Google. Paste it there and tap Post.'}
            </p>
            <Btn className="small" busy={busy} onClick={generate}>Write a different one</Btn>
          </>
        )}
      </div>
    </div>
  )
}
