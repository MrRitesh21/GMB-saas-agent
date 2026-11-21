import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../ctx'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Review, ReviewMode } from '../lib/types'
import { shortDate } from '../lib/util'
import { Btn, Empty, Loading, PageHead, Stars, Tag, useBusy } from '../ui'

const MODES: { v: ReviewMode; label: string }[] = [
  { v: 'auto_positive', label: 'Reply to 4-5 star reviews by itself, I approve the rest' },
  { v: 'auto_all', label: 'Reply to every review by itself' },
  { v: 'approve_all', label: 'Write drafts, I approve every reply' },
  { v: 'off', label: 'Do not touch my reviews' },
]

export function Reviews() {
  const { loc, patchLoc } = useApp()
  const { busy, run } = useBusy()
  const [items, setItems] = useState<Review[] | null>(null)
  const [tab, setTab] = useState<'todo' | 'done' | 'all'>('todo')
  const [edit, setEdit] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const { data } = await supabase.from('reviews').select('*').eq('location_id', loc.id).order('created_time', { ascending: false }).limit(200)
    setItems((data ?? []) as Review[])
  }, [loc.id])

  useEffect(() => {
    setItems(null)
    void load()
  }, [load])

  if (!items) return <Loading />

  const shown = items.filter((r) => (tab === 'all' ? true : tab === 'done' ? r.reply_status === 'posted' : r.reply_status !== 'posted'))
  const todo = items.filter((r) => r.reply_status !== 'posted').length

  return (
    <>
      <PageHead title="Reviews" hint={loc.last_reviews_at ? `Checked Google on ${shortDate(loc.last_reviews_at)}. The agent checks again every hour.` : undefined}>
        <Btn busy={busy === 'sync'} onClick={() => run('sync', async () => { await api('/api/reviews/sync', { location_id: loc.id }); await load() }, 'Reviews updated')}>
          Get new reviews
        </Btn>
        <Btn
          busy={busy === 'drafts'}
          onClick={() => run('drafts', async () => { const r = await api<{ drafted: number }>('/api/reviews/run', { location_id: loc.id, draft_only: true }); await load(); return r }, 'Drafts written')}
        >
          Write drafts
        </Btn>
        <Btn
          kind="primary"
          busy={busy === 'all'}
          onClick={() => {
            if (!window.confirm('Reply to waiting reviews now? Replies allowed by your reply setting will be public on Google right away.')) return
            void run('all', async () => { await api('/api/reviews/run', { location_id: loc.id }); await load() }, 'Done')
          }}
        >
          Reply to waiting reviews
        </Btn>
      </PageHead>

      <div className="panel" style={{ marginBottom: 20 }}>
        <label className="field">
          How should replies work?
          <select value={loc.review_mode} onChange={(e) => void run('mode', () => patchLoc({ review_mode: e.target.value as ReviewMode }), 'Saved')}>
            {MODES.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
          </select>
        </label>
      </div>

      <div className="tabs" role="group" aria-label="Filter">
        <button aria-pressed={tab === 'todo'} onClick={() => setTab('todo')}>Needs reply ({todo})</button>
        <button aria-pressed={tab === 'done'} onClick={() => setTab('done')}>Replied</button>
        <button aria-pressed={tab === 'all'} onClick={() => setTab('all')}>All ({items.length})</button>
      </div>

      {shown.length === 0 ? (
        <Empty title={items.length ? 'Nothing here' : 'No reviews yet'}>
          {items.length ? 'Every review in this view is handled.' : 'Tap "Get new reviews" to pull them from Google.'}
        </Empty>
      ) : (
        <div className="list">
          {shown.map((r) => {
            const text = edit[r.id] ?? r.reply_draft ?? ''
            return (
              <article className="row" key={r.id}>
                <div className="row-top">
                  <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Stars n={r.star} />
                    <strong>{r.reviewer_name ?? 'A Google user'}</strong>
                  </span>
                  <span className="meta">{shortDate(r.created_time)} <Tag kind={r.reply_status}>{r.reply_status === 'none' ? 'No reply' : r.reply_status}</Tag></span>
                </div>
                <p>{r.comment || <span className="help">No written comment.</span>}</p>
                {r.reply_status === 'posted' ? (
                  <div className="quote">{r.reply_text}</div>
                ) : (
                  <>
                    <textarea
                      rows={3}
                      aria-label="Reply"
                      placeholder="Write a reply, or let the agent draft one"
                      value={text}
                      onChange={(e) => setEdit((d) => ({ ...d, [r.id]: e.target.value }))}
                    />
                    {r.reply_error ? <p className="err">{r.reply_error}</p> : null}
                    <div className="actions">
                      <Btn
                        className="small"
                        busy={busy === `d${r.id}`}
                        onClick={() => run(`d${r.id}`, async () => {
                          const res = await api<{ text: string }>('/api/reviews/draft', { review_id: r.id })
                          setEdit((d) => ({ ...d, [r.id]: res.text }))
                          await load()
                        })}
                      >
                        {text ? 'Redraft' : 'Draft a reply'}
                      </Btn>
                      <Btn
                        kind="primary"
                        className="small"
                        disabled={!text.trim()}
                        busy={busy === `p${r.id}`}
                        onClick={() => run(`p${r.id}`, async () => { await api('/api/reviews/reply', { review_id: r.id, text }); await load() }, 'Reply posted on Google')}
                      >
                        Post reply
                      </Btn>
                    </div>
                  </>
                )}
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
