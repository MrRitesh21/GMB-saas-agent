import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../ctx'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Photo } from '../lib/types'
import { dateTime, PHOTO_CATEGORIES, pretty } from '../lib/util'
import { Btn, Empty, Loading, PageHead, Tag, Toggle, useBusy, useToast } from '../ui'

const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

export function Photos() {
  const { loc, userId, patchLoc } = useApp()
  const { busy, run } = useBusy()
  const toast = useToast()
  const [items, setItems] = useState<Photo[] | null>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [caps, setCaps] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('photos').select('*').eq('location_id', loc.id).order('created_at', { ascending: false }).limit(120)
    const list = (data ?? []) as Photo[]
    setItems(list)
    if (list.length) {
      const { data: signed } = await supabase.storage.from('gbp-photos').createSignedUrls(list.map((p) => p.storage_path), 3600)
      const map: Record<string, string> = {}
      for (const s of signed ?? []) if (s.path && s.signedUrl) map[s.path] = s.signedUrl
      setUrls(map)
    }
  }, [loc.id])

  useEffect(() => {
    setItems(null)
    void load()
  }, [load])

  if (!items) return <Loading />

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    let ok = 0
    for (const f of Array.from(files)) {
      if (!OK_TYPES.includes(f.type)) { toast(`${f.name}: use JPG, PNG or WebP`, 'error'); continue }
      if (f.size > MAX_BYTES) { toast(`${f.name} is over 10 MB`, 'error'); continue }
      const ext = f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg'
      const path = `${userId}/${crypto.randomUUID()}.${ext}`
      const up = await supabase.storage.from('gbp-photos').upload(path, f, { contentType: f.type })
      if (up.error) { toast(`${f.name}: ${up.error.message}`, 'error'); continue }
      const ins = await supabase.from('photos').insert({ user_id: userId, location_id: loc.id, storage_path: path })
      if (ins.error) { toast(ins.error.message, 'error'); continue }
      ok++
    }
    setUploading(false)
    if (input.current) input.current.value = ''
    if (ok) toast(`${ok} photo${ok === 1 ? '' : 's'} added`)
    await load()
  }

  const update = async (id: string, patch: Partial<Photo>) => {
    await supabase.from('photos').update(patch).eq('id', id)
    await load()
  }

  return (
    <>
      <PageHead title="Photos" hint="Upload a batch. The agent writes a caption, picks the category and publishes one photo a day.">
        <Btn kind="primary" busy={busy === 'sch'} onClick={() => run('sch', async () => { await api('/api/photos/schedule', { location_id: loc.id }); await load() }, 'Captioned and scheduled')}>
          Caption and schedule all
        </Btn>
      </PageHead>

      <div className="drop">
        <strong>Add photos</strong>
        <span className="help">JPG, PNG or WebP, up to 10 MB each. Real photos of your place, work and products do best.</span>
        <input ref={input} type="file" accept={OK_TYPES.join(',')} multiple hidden onChange={(e) => void upload(e.target.files)} />
        <Btn busy={uploading} onClick={() => input.current?.click()}>Choose photos</Btn>
        <Toggle
          checked={loc.auto_photos}
          label="Schedule new uploads automatically"
          onChange={(v) => void run('auto', () => patchLoc({ auto_photos: v }), v ? 'Auto scheduling is on' : 'Auto scheduling is off')}
        />
      </div>

      <section className="section">
        {items.length === 0 ? (
          <Empty title="No photos yet">Add a few and they will show up here.</Empty>
        ) : (
          <div className="photo-grid">
            {items.map((p) => {
              const locked = p.status === 'published'
              return (
                <figure className="photo" key={p.id} style={{ margin: 0 }}>
                  {urls[p.storage_path] ? <img src={urls[p.storage_path]} alt={p.caption ?? 'Uploaded photo'} loading="lazy" /> : <div style={{ aspectRatio: '4/3', background: '#e8edf5' }} />}
                  <div className="body">
                    <div className="row-top">
                      <Tag kind={p.status}>{p.status}</Tag>
                      <span className="meta">{p.scheduled_for ? dateTime(p.scheduled_for, loc.timezone) : ''}</span>
                    </div>
                    <select
                      aria-label="Category"
                      value={p.category}
                      disabled={locked}
                      onChange={(e) => void run(`c${p.id}`, () => update(p.id, { category: e.target.value }))}
                    >
                      {PHOTO_CATEGORIES.map((c) => <option key={c} value={c}>{pretty(c)}</option>)}
                    </select>
                    <input
                      type="text"
                      aria-label="Caption"
                      placeholder="Caption"
                      maxLength={110}
                      disabled={locked}
                      value={caps[p.id] ?? p.caption ?? ''}
                      onChange={(e) => setCaps((d) => ({ ...d, [p.id]: e.target.value }))}
                      onBlur={() => { const v = caps[p.id]; if (v != null && v !== (p.caption ?? '')) void run(`k${p.id}`, () => update(p.id, { caption: v })) }}
                    />
                    {p.error ? <p className="err">{p.error}</p> : null}
                    {!locked ? (
                      <div className="actions">
                        <Btn className="small" busy={busy === `a${p.id}`} onClick={() => run(`a${p.id}`, async () => { await api('/api/photos/caption', { photo_id: p.id }); setCaps((d) => { const n = { ...d }; delete n[p.id]; return n }); await load() })}>
                          AI caption
                        </Btn>
                        <Btn kind="primary" className="small" busy={busy === `u${p.id}`} onClick={() => run(`u${p.id}`, async () => { await api('/api/photos/publish', { photo_id: p.id }); await load() }, 'Published on Google')}>
                          Publish now
                        </Btn>
                        <Btn
                          kind="danger"
                          className="small"
                          onClick={() => run(`x${p.id}`, async () => {
                            await supabase.storage.from('gbp-photos').remove([p.storage_path])
                            await supabase.from('photos').delete().eq('id', p.id)
                            await load()
                          })}
                        >
                          Delete
                        </Btn>
                      </div>
                    ) : null}
                  </div>
                </figure>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
