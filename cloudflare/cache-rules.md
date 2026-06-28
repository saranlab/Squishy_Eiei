# Cloudflare Cache Rules

Configure these rules in **Cloudflare Dashboard → your zone → Rules → Cache Rules**,
in the order listed (lower number = higher priority).

---

## Rule 1 — Bypass cache for API and auth routes

**Expression:**
```
(http.request.uri.path matches "^/api/") or
(http.request.uri.path matches "^/auth/") or
(http.request.uri.path matches "^/likes/")
```

**Cache status:** Bypass

---

## Rule 2 — Cache immutable Vite assets

**Expression:**
```
http.request.uri.path matches "^/assets/"
```

**Cache status:** Cache everything  
**Edge TTL:** 1 year (override origin)  
**Browser TTL:** 1 year  

> Vite content-hashes filenames (`main.Abc123.js`), so these are safe to cache forever.

---

## Rule 3 — Cache thumbnails with short TTL

**Expression:**
```
http.request.uri.path matches "^/thumbnails/"
```

**Cache status:** Cache everything  
**Edge TTL:** 1 day  
**Browser TTL:** 1 day  
**Stale-while-revalidate:** 7 days  

---

## Rule 4 — Cache top-today endpoint (short burst protection)

**Expression:**
```
http.request.uri.path eq "/api/top-today"
```

**Cache status:** Cache everything  
**Edge TTL:** 60 seconds  

> Overrides Rule 1 for this specific path. Prevents DB hammering during traffic spikes.
> The API route itself sets `s-maxage=60` so Cloudflare respects it automatically
> if you prefer to rely on origin headers instead of this rule.

---

## Optional: Cloudflare Worker (burst protection)

A lightweight worker at `cloudflare/worker.ts` can be deployed with Wrangler if
you need request coalescing or KV-backed rate limiting beyond what cache rules offer.
```
wrangler deploy cloudflare/worker.ts
```
