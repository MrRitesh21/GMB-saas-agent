import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
const KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? ''

// False when the build had no env vars. App shows a clear message instead of a blank page.
export const configured = Boolean(SUPABASE_URL && KEY)

export const supabase = createClient(SUPABASE_URL || 'https://missing.invalid', KEY || 'missing')
export const FN_URL = `${SUPABASE_URL}/functions/v1/gmb`
