export const num = (n: number) => new Intl.NumberFormat('en-IN').format(Math.round(n))

export const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'

export const dateTime = (iso: string | null | undefined, tz?: string) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: tz,
      })
    : '-'

export const isoDay = (d: Date) => d.toISOString().slice(0, 10)

export const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)

export const hourLabel = (h: number) => {
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 === 0 ? 12 : h % 12} ${ampm}`
}

export const IMPRESSION_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
]

export const PHOTO_CATEGORIES = [
  'EXTERIOR',
  'INTERIOR',
  'PRODUCT',
  'AT_WORK',
  'FOOD_AND_DRINK',
  'MENU',
  'COMMON_AREA',
  'ROOMS',
  'TEAMS',
  'ADDITIONAL',
]

export const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney']

export const pretty = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
