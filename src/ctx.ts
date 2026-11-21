import { createContext, useContext } from 'react'
import type { Loc } from './lib/types'

export type AppCtx = {
  userId: string
  email: string
  google: { google_email: string | null; updated_at: string } | null
  locations: Loc[]
  loc: Loc
  setLocId: (id: string) => void
  reload: () => Promise<void>
  patchLoc: (patch: Partial<Loc>) => Promise<void>
}

export const Ctx = createContext<AppCtx>(null as unknown as AppCtx)
export const useApp = () => useContext(Ctx)
