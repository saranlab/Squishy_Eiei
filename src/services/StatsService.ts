// ─────────────────────────────────────────────────────────────────────────────
// StatsService — interface that both Postgres and Redis implementations satisfy.
// All API routes call getStatsService() from api/_lib/stats.ts.
// Swap the concrete class there to migrate without touching any API route.
// ─────────────────────────────────────────────────────────────────────────────

import type { TopSquishy } from '../types'

export interface Stats {
  play_count:  number
  like_count:  number
  share_count: number
}

export interface StatsService {
  /** Atomically add 1 to play_count */
  incrementPlay(squishyId: string): Promise<void>

  /** Atomically add 1 to like_count */
  incrementLike(squishyId: string): Promise<void>

  /** Atomically subtract 1 from like_count (floors at 0) */
  decrementLike(squishyId: string): Promise<void>

  /** Atomically add 1 to share_count */
  incrementShare(squishyId: string): Promise<void>

  /** Read current stats for one squishy */
  getStats(squishyId: string): Promise<Stats | null>

  /** Return top squishies, sorted by play_count desc */
  getTopToday(limit?: number): Promise<TopSquishy[]>
}
