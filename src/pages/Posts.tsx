import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../ctx'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Post } from '../lib/types'
import { dateTime, hourLabel } from '../lib/util'
import { Btn, Empty, Loading, PageHead, Tag, Toggle, useBusy } from '../ui'

export function Posts() {
  const { loc, patchLoc } = useApp()
  const { busy, run } = useBusy()
  const [items, setItems] = useState<Post[] | null>(null)
  const [count, setCount] = useState(7)
  const [edit, setEdit] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const { data } = await supabase.from('posts').select('*').eq('location_id', loc.id).order('scheduled_for', { ascending: false, nullsFirst: true }).limit(100)
    setItems((data ?? []) as Post[])
  }, [loc.id])

  useEffect(() => {
    setItems(null)
    void load()
  }, [load])

  if (!items) return <Loading />

  const save = async (p: Post) => {
    const body = edit[p.id]
    if (body == null || body === p.body) return
    const { error } = await supabase.from('posts').update({ body }).eq('id', p.id)
    if (error) throw new Error(error.message)
    await load()
  }

  return (
    <>
      <PageHead title="Daily posts" hint={`Each post is written around your pinned keywords and goes live at ${hourLabel(loc.post_hour)} (${loc.timezone}).`}>
        <select aria-label="How many posts" value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: 'auto' }}>
          {[3, 7, 14].map((n) => <option key={n} value={n}>{n} posts</option>)}
        </select>
        <Btn kind="primary" busy={busy === 'gen'} onClick={() => run('gen', async () => { await api('/api/posts/generate', { location_id: loc.id, count }); await load() }, 'Posts scheduled')}>
          Write posts
        </Btn>
      </PageHead>

      <div className="panel" style={{ marginBottom: 20, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Toggle
          checked={loc.auto_posts}
          label="Keep a week of posts ready, automatically"
          onChange={(v) => void run('auto', () => patchLoc({ auto_posts: v }), v ? 'Auto posting is on' : 'Auto posting is off')}
        />
        <label className="field" style={{ gridAutoFlow: 'column', alignItems: 'center' }}>
          Post at
          <select style={{ width: 'auto' }} value={loc.post_hour} onChange={(e) => void run('hr', () => patchLoc({ post_hour: Number(e.target.value) }), 'Saved')}>
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
          </select>
        </label>
      </div>

      {items.length === 0 ? (
        <Empty title="No posts yet">Tap "Write posts". They are scheduled one per day and published for you.</Empty>
      ) : (
        <div className="list">
          {items.map((p) => {
            const locked = p.status === 'published'
            return (
              <article className="row" key={p.id}>
                <div className="row-top">
                  <strong>{p.topic ?? 'Update'}</strong>
                  <span className="meta">{dateTime(p.scheduled_for, loc.timezone)} <Tag kind={p.status}>{p.status}</Tag></span>
                </div>
                {locked ? (
                  <p>{p.body}</p>
                ) : (
                  <textarea
                    rows={4}
                    aria-label="Post text"
                    value={edit[p.id] ?? p.body}
                    onChange={(e) => setEdit((d) => ({ ...d, [p.id]: e.target.value }))}
                    onBlur={() => void run(`s${p.id}`, () => save(p))}
                  />
                )}
                {p.error ? <p className="err">{p.error}</p> : null}
                {!locked ? (
                  <div className="actions">
                    <Btn
                      kind="primary"
                      className="small"
                      busy={busy === `p${p.id}`}
                      onClick={() => run(`p${p.id}`, async () => { await save(p); await api('/api/posts/publish', { post_id: p.id }); await load() }, 'Published on Google')}
                    >
                      Publish now
                    </Btn>
                    <Btn
                      kind="danger"
                      className="small"
                      onClick={() => run(`x${p.id}`, async () => { await supabase.from('posts').delete().eq('id', p.id); await load() })}
                    >
                      Delete
                    </Btn>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
