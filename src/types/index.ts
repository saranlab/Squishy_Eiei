// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript types — database rows, API shapes, analytics events
// ─────────────────────────────────────────────────────────────────────────────

// ── Database rows ─────────────────────────────────────────────────────────────

export interface Creator {
  id:              string
  name:            string
  avatar_url:      string | null
  bio:             string | null
  total_squishies: number
  total_likes:     number
  created_at:      string
  updated_at:      string
}

export interface ComposedPart {
  id:           string
  baseShape:    string
  color:        string
  textLabel?:   string
  partScale?:   number
  transform?:   { x: number; y: number; z: number }
  positions?:   number[] | null
  vertexColors?: number[] | null
}

export interface SquishyPhysics {
  bounce?:  number
  mass?:    number
  stretch?: number
}

export interface SquishyConfig {
  // Preset shape fields
  shape?:       string
  color?:       string
  geometry?:    string
  texture?:     string
  elasticity?:  number
  softness?:    number
  physics?:     SquishyPhysics
  // Composed / sculpted fields
  composition?: ComposedPart[]
  // Rise spring
  riseSpeed?:   { tension: number; friction: number; mass: number }
  speed?:       string
  // Extra per-toy properties
  pitColor?:    string
  hornColor?:   string
  blushColor?:  string
  earColor?:    string
}

export interface Squishy {
  id:            string
  title:         string
  creator_id:    string
  thumbnail_url: string | null
  config_json:   SquishyConfig
  is_published:  boolean
  created_at:    string
  published_at:  string | null
  updated_at:    string
}

export interface SquishyStats {
  squishy_id:  string
  play_count:  number
  like_count:  number
  share_count: number
  updated_at:  string
}

export interface Like {
  id:           string
  squishy_id:   string
  anonymous_id: string
  created_at:   string
}

// ── Enriched / joined shapes ──────────────────────────────────────────────────

export interface SquishyWithDetails extends Squishy {
  stats:   SquishyStats
  creator: Pick<Creator, 'id' | 'name' | 'avatar_url'>
  liked?:  boolean // populated from anonymous_id check
}

export interface TopSquishy {
  id:            string
  title:         string
  creator_id:    string
  creator_name:  string
  avatar_url:    string | null
  thumbnail_url: string | null
  config_json:   SquishyConfig
  published_at:  string | null
  play_count:    number
  like_count:    number
  share_count:   number
}

export interface CreatorWithSquishies extends Creator {
  squishies: SquishyWithDetails[]
}

// ── API request / response types ──────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data:  T | null
  error: string | null
}

export interface CreateSquishyRequest {
  title:          string
  creator_id:     string
  config_json:    SquishyConfig
  thumbnail_url?: string
}

export interface PublishSquishyRequest {
  squishy_id: string
  creator_id: string
}

export interface LikeRequest {
  anonymous_id: string
}

export interface LikeResponse {
  liked:      boolean
  like_count: number
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export type AnalyticsEvent =
  | 'squishy_created'
  | 'squishy_published'
  | 'squishy_played'
  | 'squishy_liked'
  | 'squishy_shared'
  | 'creator_page_viewed'
  | 'top_today_viewed'

export interface AnalyticsProperties {
  squishy_id?:  string
  creator_id?:  string
  source?:      string
  country?:     string
  device_type?: 'mobile' | 'desktop' | 'tablet'
  referrer?:    string
  [key: string]: string | number | boolean | undefined
}
