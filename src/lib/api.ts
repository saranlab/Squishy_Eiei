// Thin wrapper around /api routes. All methods throw on non-2xx.
import type {
  CreateSquishyRequest,
  PublishSquishyRequest,
  LikeRequest,
  LikeResponse,
  ApiResponse,
  SquishyWithDetails,
  TopSquishy,
  CreatorWithSquishies,
} from '../types'

const BASE = import.meta.env.VITE_API_BASE ?? ''

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json: ApiResponse<T> = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? res.statusText)
  return (json as { data: T }).data
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path)
  const json: ApiResponse<T> = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? res.statusText)
  return (json as { data: T }).data
}

export const api = {
  createSquishy: (body: CreateSquishyRequest) =>
    post<{ id: string; title: string; created_at: string }>('/api/squishy/create', body),

  publishSquishy: (body: PublishSquishyRequest) =>
    post<{ published: boolean }>('/api/squishy/publish', body),

  getSquishy: (id: string) =>
    get<SquishyWithDetails>(`/api/squishy/${id}`),

  likeSquishy: (id: string, body: LikeRequest) =>
    post<LikeResponse>(`/api/squishy/${id}/like`, body),

  recordPlay: (id: string) =>
    post<{ ok: boolean }>(`/api/squishy/${id}/play`, {}),

  recordShare: (id: string) =>
    post<{ ok: boolean }>(`/api/squishy/${id}/share`, {}),

  getTopToday: (limit = 20) =>
    get<TopSquishy[]>(`/api/top-today?limit=${limit}`),

  getCreator: (id: string) =>
    get<CreatorWithSquishies>(`/api/creator/${id}`),
}
