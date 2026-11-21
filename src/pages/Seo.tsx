import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../ctx'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Keyword, ProfileVersion } from '../lib/types'
import { dateTime } from '../lib/util'
import { Btn, Empty, Loading, PageHead, Tag, useBusy } from '../ui'

const MAX = 750

export function Seo() {
  const { loc, userId, reload } = useApp()
  const { busy, run } = useBusy()
  const [kws, setKws] = useState<Keyword[] | null>(null)
  const [versions, setVersions] = useState<ProfileVersion[]>([])
  const [tips, setTips] = useState<string[]>([])
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [newKw, setNewKw] = useState('')

  const load = useCallback(async () => {
    const [k, v] = await Promise.all([
      supabase.from('keywords').select('id, keyword, intent, pinned').eq('location_id', loc.id).order('created_at', { ascending: false }),
      supabase.from('profile_versions').select('*').eq('location_id', loc.id).order('created_at', { ascending: false }).limit(10),
    ])
    setKws((k.data ?? []) as Keyword[])
    setVersions((v.data ?? []) as ProfileVersion[])
  }, [loc.id])

  useEffect(() => {
    setKws(null)
    setTips([])
    void load()
  }, [load])

  if (!kws) return <Loading />

  const proposed = versions.find((v) => v.status === 'proposed')
  const text = proposed ? (draft[proposed.id] ?? proposed.new_description) : ''

  const addKeyword = async () => {
    const k = newKw.trim().toLowerCase()
    if (!k) return
    const { error } = await supabase.from('keywords').upsert({ user_id: userId, location_id: loc.id, keyword: k, pinned: true }, { onConflict: 'location_id,keyword' })
    if (error) throw new Error(error.message)
    setNewKw('')
    await load()
  }

  return (
    <>
      <PageHead title="Profile SEO" hint="We write a new business description around the searches your customers type. You check it, then it goes live on Google.">
        <Btn
          kind="primary"
          busy={busy === 'gen'}
          onClick={() =>
            run('gen', async () => {
              const r = await api<{ tips: string[] }>('/api/seo/generate', { location_id: loc.id })
              setTips(r.tips ?? [])
              await load()
            }, 'New version ready')
          }
        >
          {proposed ? 'Write another version' : 'Rewrite my profile'}
        </Btn>
      </PageHead>

      {proposed ? (
        <section className="section" style={{ marginTop: 0 }}>
          <h2>Proposed description</h2>
          <div className="panel">
            <div className="compare">
              <div className="col">
                <b>On Google now</b>
                <div className="old-text">{proposed.old_description || 'No description yet.'}</div>
              </div>
              <div className="col">
                <b>New version (you can edit)</b>
                <textarea
                  value={text}
                  rows={7}
                  onChange={(e) => setDraft((d) => ({ ...d, [proposed.id]: e.target.value }))}
                  aria-label="New description"
                />
                <span className={`count ${text.length > MAX ? 'over' : ''}`}>{text.length} / {MAX} characters</span>
              </div>
            </div>
            <div className="actions" style={{ marginTop: 14 }}>
              <Btn
                kind="sun"
                busy={busy === 'apply'}
                disabled={!text.trim() || text.length > MAX}
                onClick={() =>
                  run('apply', async () => {
                    const { error } = await supabase.from('profile_versions').update({ new_description: text }).eq('id', proposed.id)
                    if (error) throw new Error(error.message)
                    await api('/api/seo/apply', { version_id: proposed.id })
                    await Promise.all([load(), reload()])
                  }, 'Live on Google. It can take a little while to show.')
                }
              >
                Put it on Google
              </Btn>
              <Btn
                busy={busy === 'dismiss'}
                onClick={() =>
                  run('dismiss', async () => {
                    await supabase.from('profile_versions').update({ status: 'dismissed' }).eq('id', proposed.id)
                    await load()
                  })
                }
              >
                Dismiss
              </Btn>
            </div>
          </div>
          {tips.length ? (
            <div className="panel">
              <h3>Do these by hand in Google</h3>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                {tips.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          ) : null}
        </section>
      ) : (
        <Empty title="No version waiting">Tap "Rewrite my profile" to get a new description and keyword list.</Empty>
      )}

      <section className="section">
        <h2>Keywords we use</h2>
        <p className="hint" style={{ marginBottom: 12 }}>
          Pinned keywords are used in your description, review replies, posts and review links. Unpin one to stop using it.
        </p>
        <div className="chips">
          {kws.map((k) => (
            <span key={k.id} className={`chip ${k.pinned ? 'pinned' : ''}`}>
              <button
                title={k.pinned ? 'Unpin' : 'Pin'}
                aria-label={`${k.pinned ? 'Unpin' : 'Pin'} ${k.keyword}`}
                style={{ color: 'var(--ink)', padding: 0 }}
                onClick={async () => { await supabase.from('keywords').update({ pinned: !k.pinned }).eq('id', k.id); await load() }}
              >
                {k.pinned ? '●' : '○'}
              </button>
              {k.keyword}
              <button aria-label={`Remove ${k.keyword}`} onClick={async () => { await supabase.from('keywords').delete().eq('id', k.id); await load() }}>×</button>
            </span>
          ))}
          {kws.length === 0 ? <span className="help">None yet.</span> : null}
        </div>
        <form
          className="url-line"
          style={{ marginTop: 14, maxWidth: 460 }}
          onSubmit={(e) => { e.preventDefault(); void run('kw', addKeyword) }}
        >
          <input type="text" placeholder="Add your own, like “braces near me”" value={newKw} onChange={(e) => setNewKw(e.target.value)} aria-label="New keyword" />
          <Btn type="submit" busy={busy === 'kw'}>Add</Btn>
        </form>
      </section>

      {versions.some((v) => v.status === 'applied') ? (
        <section className="section">
          <h2>Past changes</h2>
          <div className="list">
            {versions.filter((v) => v.status === 'applied').map((v) => (
              <div className="row" key={v.id}>
                <div className="row-top"><Tag kind="applied">Live</Tag><span className="meta">{dateTime(v.applied_at)}</span></div>
                <p>{v.new_description}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}
