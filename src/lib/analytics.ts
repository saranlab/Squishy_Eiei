// PostHog wrapper. No-ops when VITE_POSTHOG_KEY is unset (local dev).
import type { AnalyticsEvent, AnalyticsProperties } from '../types'

let _ph: { capture: (e: string, p?: Record<string, unknown>) => void } | null = null

async function getPostHog() {
  if (_ph !== null) return _ph
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) { _ph = { capture: () => undefined }; return _ph }
  const { default: posthog } = await import('posthog-js')
  posthog.init(key, { api_host: 'https://app.posthog.com', autocapture: false })
  _ph = posthog
  return _ph
}

export async function track(event: AnalyticsEvent, properties?: AnalyticsProperties) {
  const ph = await getPostHog()
  ph.capture(event, properties as Record<string, unknown>)
}
