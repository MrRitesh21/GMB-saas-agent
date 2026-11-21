import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

// ---------- toasts ----------
type Toast = { id: number; msg: string; kind: 'ok' | 'error' }
const ToastCtx = createContext<(msg: string, kind?: 'ok' | 'error') => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const id = useRef(0)
  const push = useCallback((msg: string, kind: 'ok' | 'error' = 'ok') => {
    const n = ++id.current
    setItems((t) => [...t, { id: n, msg, kind }])
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== n)), kind === 'error' ? 7000 : 3500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

// One busy key at a time; errors become toasts.
export function useBusy() {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const run = useCallback(
    async (key: string, fn: () => Promise<unknown>, ok?: string) => {
      setBusy(key)
      try {
        await fn()
        if (ok) toast(ok)
      } catch (e) {
        toast((e as Error).message, 'error')
      } finally {
        setBusy(null)
      }
    },
    [toast],
  )
  return { busy, run }
}

// ---------- small pieces ----------
export function Btn({
  kind = 'ghost',
  busy,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: 'primary' | 'ghost' | 'danger' | 'sun'; busy?: boolean }) {
  return (
    <button {...rest} className={`btn ${kind} ${rest.className ?? ''}`} disabled={rest.disabled || busy}>
      {busy ? <span className="spin" aria-hidden /> : null}
      {children}
    </button>
  )
}

export function PageHead({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {hint ? <p className="hint">{hint}</p> : null}
      </div>
      <div className="head-actions">{children}</div>
    </header>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  )
}

export function Loading() {
  return (
    <div className="loading">
      <span className="spin dark" aria-hidden /> Loading
    </div>
  )
}

export function Stars({ n, size = 16 }: { n: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${n} out of 5 stars`} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= n ? 'on' : ''} aria-hidden>
          ★
        </span>
      ))}
    </span>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" aria-hidden />
      <span>{label}</span>
    </label>
  )
}

export function Tag({ kind, children }: { kind: string; children: ReactNode }) {
  return <span className={`tag ${kind}`}>{children}</span>
}

// Simple daily bar chart.
export function Bars({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(1, ...values)
  const w = 600
  const h = 130
  const step = w / Math.max(values.length, 1)
  return (
    <svg viewBox={`0 0 ${w} ${h + 18}`} className="bars" role="img" aria-label="Daily impressions for the last 30 days">
      {values.map((v, i) => {
        const bh = Math.max(2, (v / max) * h)
        return (
          <rect key={i} x={i * step + 2} y={h - bh} width={Math.max(step - 4, 2)} height={bh} rx={2}>
            <title>{`${labels[i]}: ${v}`}</title>
          </rect>
        )
      })}
      <text x={0} y={h + 14}>{labels[0]}</text>
      <text x={w} y={h + 14} textAnchor="end">{labels[labels.length - 1]}</text>
    </svg>
  )
}
