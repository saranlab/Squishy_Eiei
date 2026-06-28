// ─────────────────────────────────────────────────────────────────────────────
// PostgresStatsService — current (Phase 1) implementation via Supabase RPC.
// Uses adjust_stat() and get_top_today() from migration 004_functions.sql.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { StatsService, Stats } from './StatsService'
import type { TopSquishy } from '../types'

export class PostgresStatsService implements StatsService {
  private db: SupabaseClient

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })
  }

  async incrementPlay(squishyId: string): Promise<void> {
    await this.db.rpc('adjust_stat', {
      p_squishy_id: squishyId,
      p_column:     'play_count',
      p_delta:      1,
    })
  }

  async incrementLike(squishyId: string): Promise<void> {
    await this.db.rpc('adjust_stat', {
      p_squishy_id: squishyId,
      p_column:     'like_count',
      p_delta:      1,
    })
  }

  async decrementLike(squishyId: string): Promise<void> {
    await this.db.rpc('adjust_stat', {
      p_squishy_id: squishyId,
      p_column:     'like_count',
      p_delta:      -1,
    })
  }

  async incrementShare(squishyId: string): Promise<void> {
    await this.db.rpc('adjust_stat', {
      p_squishy_id: squishyId,
      p_column:     'share_count',
      p_delta:      1,
    })
  }

  async getStats(squishyId: string): Promise<Stats | null> {
    const { data } = await this.db
      .from('squishy_stats')
      .select('play_count, like_count, share_count')
      .eq('squishy_id', squishyId)
      .single()
    return data ?? null
  }

  async getTopToday(limit = 20): Promise<TopSquishy[]> {
    const { data } = await this.db.rpc('get_top_today', { p_limit: limit })
    return (data as TopSquishy[]) ?? []
  }
}
