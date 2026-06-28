// Swap point: change the import and constructor call here to migrate from
// Postgres to Redis without touching any API route file.
import { PostgresStatsService } from '../../src/services/PostgresStatsService'
import type { StatsService } from '../../src/services/StatsService'

let _instance: StatsService | null = null

export function getStatsService(): StatsService {
  if (!_instance) {
    _instance = new PostgresStatsService(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _instance
}
