import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../ctx'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { MetricRow, SearchKeyword } from '../lib/types'
import { daysAgo, IMPRESSION_METRICS, isoDay, num, shortDate } from '../lib/util'
import { Bars, Btn, Empty, Loading, PageHead, useBusy } from '../ui'

type Counts = { reviews: number; posts: number; photos: number }

export function Overview() {
  const { loc } = useApp()
  const { busy, run } = useBusy()
  const [rows, setRows] = useState<MetricRow[] | null>(null)
  const [kws, setKws] = useState<SearchKeyword[]>([])
  const [counts, setCounts] = useState<Counts | null>(null)

  const load = useCallback(async () => {
    const since = isoDay(daysAgo(59))
    const [m, k, r, p, ph] = await Promise.all([
      supabase.from('metrics_daily').select('day, metric, value').eq('location_id', loc.id).gte('day', since).limit(2000),
      supabase.from('search_keywords').select('month, keyword, impressions, threshold').eq('location_id', loc.id).order('month', { ascending: false }).limit(300),
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('location_id', loc.id).in('reply_status', ['none', 'drafted', 'failed']),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('location_id', loc.id).eq('status', 'scheduled'),
      supabase.from('photos').select('id', { count: 'exact', head: true }).eq('location_id', loc.id).in('status', ['uploaded', 'scheduled']),
    ])
    setRows((m.data ?? []) as MetricRow[])
    setKws((k.data ?? []) as SearchKeyword[])
    setCounts({ reviews: r.count ?? 0, posts: p.count ?? 0, photos: ph.count ?? 0 })
  }, [loc.id])

  useEffect(() => {
    setRows(null)
    void load()
  }, [load])

  if (!rows || !counts) return <Loading />

  const cutNow = isoDay(daysAgo(29))
  const sum = (names: string[], from: string, to?: string) =>
    rows.filter((r) => names.includes(r.metric) && r.day >= from && (!to || r.day < to)).reduce((a, r) => a + Number(r.value), 0)

  const cards = [
    { label: 'Times people saw you', names: IMPRESSION_METRICS },
    { label: 'Calls', names: ['CALL_CLICKS'] },
    { label: 'Website visits', names: ['WEBSITE_CLICKS'] },
    { label: 'Direction requests', names: ['BUSINESS_DIRECTION_REQUESTS'] },
    { label: 'Bookings', names: ['BUSINESS_BOOKINGS'] },
  ].map((c) => {
    const now = sum(c.names, cutNow)
    const before = sum(c.names, isoDay(daysAgo(59)), cutNow)
    const delta = before > 0 ? Math.round(((now - before) / before) * 100) : null
    return { ...c, now, delta }
  })

  const days = Array.from({ length: 30 }, (_, i) => isoDay(daysAgo(29 - i)))
  const perDay = days.map((d) => rows.filter((r) => r.day === d && IMPRESSION_METRICS.includes(r.metric)).reduce((a, r) => a + Number(r.value), 0))

  const latestMonth = kws[0]?.month
  const topKws = kws
    .filter((k) => k.month === latestMonth)
    .sort((a, b) => (b.impressions ?? b.threshold ?? 0) - (a.impressions ?? a.threshold ?? 0))
    .slice(0, 10)

  const empty = rows.length === 0

  return (
    <>
      <PageHead title="Overview" hint={loc.last_metrics_at ? `Stats last pulled from Google on ${shortDate(loc.last_metrics_at)}.` : 'Google stats are pulled automatically once a day.'}>
        <Btn
          kind="primary"
          busy={busy === 'sync'}
          onClick={() => run('sync', async () => { await api('/api/analytics/sync', { location_id: loc.id }); await load() }, 'Stats updated')}
        >
          Refresh from Google
        </Btn>
      </PageHead>

      {empty ? (
        <Empty title="No stats yet">
          Tap "Refresh from Google" to pull the last 90 days. New profiles can take a few days to show numbers.
        </Empty>
      ) : (
        <>
          <div className="stats">
            {cards.map((c) => (
              <div className="stat" key={c.label}>
                <div className="label">{c.label}</div>
                <div className="value">{num(c.now)}</div>
                <div className={`delta ${c.delta == null ? '' : c.delta >= 0 ? 'up' : 'down'}`}>
                  {c.delta == null ? 'Last 30 days' : `${c.delta >= 0 ? '▲' : '▼'} ${Math.abs(c.delta)}% vs previous 30 days`}
                </div>
              </div>
            ))}
          </div>
          <section className="section">
            <h2>Views per day</h2>
            <div className="panel">
              <Bars values={perDay} labels={days.map(shortDate)} />
            </div>
          </section>
        </>
      )}

      <section className="section grid2">
        <div>
          <h2>What the agent is doing</h2>
          <div className="panel">
            <div className="agent-line"><b>{counts.reviews}</b> reviews waiting for a reply</div>
            <div className="agent-line"><b>{counts.posts}</b> posts queued</div>
            <div className="agent-line" style={{ borderBottom: 0 }}><b>{counts.photos}</b> photos waiting to go live</div>
          </div>
        </div>
        <div>
          <h2>Searches that found you</h2>
          {topKws.length ? (
            <div className="panel">
              <table className="kw-table">
                <thead><tr><th>Search</th><th>Times</th></tr></thead>
                <tbody>
                  {topKws.map((k) => (
                    <tr key={k.keyword}>
                      <td>{k.keyword}</td>
                      <td>{k.impressions != null ? num(k.impressions) : `under ${num(k.threshold ?? 15)}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Nothing yet">Google shows search terms once enough people have found you.</Empty>
          )}
        </div>
      </section>
    </>
  )
}
