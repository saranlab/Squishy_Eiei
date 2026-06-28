// ─────────────────────────────────────────────────────────────────────────────
// RedisStatsService — Phase 2 implementation (Upstash Redis).
//
// Migration path (zero frontend changes):
//   1. npm install @upstash/redis
//   2. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in env
//   3. In api/_lib/stats.ts swap PostgresStatsService → RedisStatsService
//   4. Deploy — done.
//
// Top-today uses a Redis sorted set keyed by UTC date so counts reset daily.
// A separate cron (Vercel Cron / Supabase Edge Function) syncs Redis → Postgres
// every 5 minutes to keep the DB consistent and preserve historical data.
// ─────────────────────────────────────────────────────────────────────────────

import type { StatsService, Stats } from './StatsService'
import type { TopSquishy } from '../types'

type RedisClient = {
  incr(key: string): Promise<number>
  incrby(key: string, delta: number): Promise<number>
  get(key: string): Promise<string | null>
  zadd(key: string, score: number, member: string): Promise<number>
  zrange(key: string, min: number, max: number, opts?: { rev?: boolean; withScores?: boolean }): Promise<unknown[]>
  expire(key: string, seconds: number): Promise<number>
}

type SupabaseClient = {
  rpc(fn: string, args?: Record<string, unknown>): Promise<{ data: unknown }>
}

const TODAY_KEY = () => `top:${new Date().toISOString().slice(0, 10)}`  // top:2025-06-28
const STAT_KEY  = (id: string, field: string) => `sq:${id}:${field}`
const TTL_DAYS  = 60 * 60 * 24 * 2  // 2-day TTL on individual counters

export class RedisStatsService implements StatsService {
  constructor(
    private redis:    RedisClient,
    private supabase: SupabaseClient,  // used for getTopToday metadata hydration
  ) {}

  async incrementPlay(squishyId: string): Promise<void> {
    await Promise.all([
      this.redis.incr(STAT_KEY(squishyId, 'play_count')),
      this.redis.expire(STAT_KEY(squishyId, 'play_count'), TTL_DAYS),
      // Sorted set for top-today leaderboard
      this.redis.zadd(TODAY_KEY(), 1, squishyId).catch(() => null),
    ])
  }

  async incrementLike(squishyId: string): Promise<void> {
    await this.redis.incr(STAT_KEY(squishyId, 'like_count'))
  }

  async decrementLike(squishyId: string): Promise<void> {
    await this.redis.incrby(STAT_KEY(squishyId, 'like_count'), -1)
  }

  async incrementShare(squishyId: string): Promise<void> {
    await this.redis.incr(STAT_KEY(squishyId, 'share_count'))
  }

  async getStats(squishyId: string): Promise<Stats | null> {
    const [play, like, share] = await Promise.all([
      this.redis.get(STAT_KEY(squishyId, 'play_count')),
      this.redis.get(STAT_KEY(squishyId, 'like_count')),
      this.redis.get(STAT_KEY(squishyId, 'share_count')),
    ])
    return {
      play_count:  parseInt(play  ?? '0', 10),
      like_count:  parseInt(like  ?? '0', 10),
      share_count: parseInt(share ?? '0', 10),
    }
  }

  async getTopToday(limit = 20): Promise<TopSquishy[]> {
    // Fallback to Postgres for metadata-rich response.
    // A production version would read the sorted set and hydrate from a cache.
    const { data } = await this.supabase.rpc('get_top_today', { p_limit: limit })
    return (data as TopSquishy[]) ?? []
  }
}
