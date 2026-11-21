export type ReviewMode = 'off' | 'approve_all' | 'auto_positive' | 'auto_all'

export type Loc = {
  id: string
  user_id: string
  google_account: string
  google_location: string
  title: string
  address: string | null
  city: string | null
  phone: string | null
  website: string | null
  primary_category: string | null
  place_id: string | null
  description: string | null
  services: string[]
  brand_voice: string
  language: string
  slug: string
  review_mode: ReviewMode
  auto_posts: boolean
  post_hour: number
  auto_photos: boolean
  timezone: string
  last_synced_at: string | null
  last_reviews_at: string | null
  last_metrics_at: string | null
}

export type Keyword = { id: string; keyword: string; intent: string | null; pinned: boolean }

export type ProfileVersion = {
  id: string
  old_description: string | null
  new_description: string
  keywords: string[]
  status: 'proposed' | 'applied' | 'dismissed'
  created_at: string
  applied_at: string | null
}

export type Review = {
  id: string
  location_id: string
  google_review_id: string
  reviewer_name: string | null
  star: number
  comment: string | null
  created_time: string | null
  reply_text: string | null
  reply_draft: string | null
  reply_status: 'none' | 'drafted' | 'posted' | 'failed'
  reply_error: string | null
  replied_at: string | null
}

export type Post = {
  id: string
  topic: string | null
  body: string
  cta_type: string | null
  cta_url: string | null
  scheduled_for: string | null
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  error: string | null
}

export type Photo = {
  id: string
  storage_path: string
  category: string
  caption: string | null
  scheduled_for: string | null
  status: 'uploaded' | 'scheduled' | 'published' | 'failed'
  error: string | null
}

export type ReviewRequest = {
  id: string
  rating: number
  highlights: string[]
  generated_text: string | null
  copied_at: string | null
  opened_at: string | null
  created_at: string
}

export type MetricRow = { day: string; metric: string; value: number }
export type SearchKeyword = { month: string; keyword: string; impressions: number | null; threshold: number | null }
