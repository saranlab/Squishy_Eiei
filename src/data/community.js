import { supabase } from '../lib/supabase'
import { compressToy, hydrateToy } from '../lib/toyCompression'

const POSTS_KEY   = 'sq_community'
const LIKES_KEY   = 'sq_likes'
const NAME_KEY    = 'sq_creator_name'

const DEFAULT_SPEED = { tension: 35, friction: 18, mass: 4 }

const SEEDS = [
  { id: 'seed_1', toy: { name: 'Fluffy Ball',  emoji: '🫧', geometry: 'sphere',    color: '#FF6B6B', colorDark: '#CC3C3C', colorLight: '#FFAAAA', riseSpeed: DEFAULT_SPEED }, creatorName: 'SquishFan',   likes: 24, plays: 312 },
  { id: 'seed_2', toy: { name: 'Avocado',      emoji: '🥑', geometry: 'avocado',   color: '#78B644', colorDark: '#4A7022', colorLight: '#AADE80', pitColor: '#7A4E28', riseSpeed: DEFAULT_SPEED }, creatorName: 'GreenThumb',  likes: 31, plays: 487 },
  { id: 'seed_3', toy: { name: 'Bread Loaf',   emoji: '🍞', geometry: 'bread',     color: '#E8C87A', colorDark: '#B89030', colorLight: '#F8E8AA', riseSpeed: DEFAULT_SPEED }, creatorName: 'BakeryLove',  likes: 18, plays: 156 },
  { id: 'seed_4', toy: { name: 'Choco Bar',    emoji: '🍫', geometry: 'chocolate', color: '#7A4228', colorDark: '#4A2210', colorLight: '#B07050', riseSpeed: { tension: 22, friction: 13, mass: 7 } }, creatorName: 'ChocoLover',  likes: 42, plays: 821 },
  { id: 'seed_5', toy: { name: 'Butter Block', emoji: '🧈', geometry: 'butter',    color: '#EDE8C0', colorDark: '#C4B870', colorLight: '#F8F5E0', riseSpeed: DEFAULT_SPEED }, creatorName: 'ButterMaker', likes: 15, plays: 98  },
  { id: 'seed_6', toy: { name: 'Unicorn',      emoji: '🦄', geometry: 'unicorn',   color: '#E8B0E0', colorDark: '#C070A0', colorLight: '#FFD8FF', riseSpeed: DEFAULT_SPEED }, creatorName: 'MagicMochi',  likes: 37, plays: 634 },
]

// ─── localStorage helpers (offline / seed fallback) ───────────────────────────

function init() {
  if (!localStorage.getItem(POSTS_KEY)) {
    const now    = Date.now()
    const seeded = SEEDS.map((s, i) => ({ ...s, timestamp: now - (i + 1) * 1000 * 60 * 60 * (3 + i * 2) }))
    localStorage.setItem(POSTS_KEY, JSON.stringify(seeded))
  }
}

function getRaw() {
  try {
    const posts = JSON.parse(localStorage.getItem(POSTS_KEY) || '[]')
    return posts.map(p => ({ plays: Math.round((p.likes ?? 0) * 9), ...p }))
  } catch { return [] }
}

function saveRaw(posts) {
  try { localStorage.setItem(POSTS_KEY, JSON.stringify(posts)) } catch {}
}

function getLikedSet() {
  try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY) || '[]')) } catch { return new Set() }
}
function saveLikedSet(s) {
  try { localStorage.setItem(LIKES_KEY, JSON.stringify([...s])) } catch {}
}

export function getSortedPosts(sort = 'likes', search = '') {
  init()
  let posts = getRaw()
  if (search.trim()) {
    const q = search.toLowerCase()
    posts = posts.filter(p =>
      p.toy.name?.toLowerCase().includes(q) ||
      p.creatorName?.toLowerCase().includes(q)
    )
  }
  const now = Date.now()
  if (sort === 'newest')   return [...posts].sort((a, b) => b.timestamp - a.timestamp)
  if (sort === 'trending') return [...posts].sort((a, b) => {
    const hr = ms => Math.max(1, ms / 3_600_000)
    return (b.likes / hr(now - b.timestamp)) - (a.likes / hr(now - a.timestamp))
  })
  return [...posts].sort((a, b) => b.likes - a.likes)
}

export function addPost(toy, creatorName) {
  init()
  const post = {
    id: `sq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    toy: {
      id:          toy.id,
      name:        toy.name,
      emoji:       toy.emoji,
      color:       toy.color,
      colorDark:   toy.colorDark,
      colorLight:  toy.colorLight,
      geometry:    toy.geometry,
      pitColor:    toy.pitColor   ?? null,
      hornColor:   toy.hornColor  ?? null,
      blushColor:  toy.blushColor ?? null,
      earColor:    toy.earColor   ?? null,
      composition: toy.composition ?? null,
      riseSpeed:   toy.riseSpeed ?? DEFAULT_SPEED,
      speed:       toy.speed ?? 'normal',
    },
    creatorName: (creatorName || 'Anonymous').trim().slice(0, 24),
    likes: 0,
    plays: 0,
    timestamp: Date.now(),
  }
  saveRaw([post, ...getRaw()])
  return post
}

export function toggleLike(postId) {
  const liked = getLikedSet()
  const posts = getRaw()
  const post  = posts.find(p => p.id === postId)
  if (!post) return { count: 0, isLiked: false }
  if (liked.has(postId)) {
    post.likes = Math.max(0, post.likes - 1)
    liked.delete(postId)
  } else {
    post.likes++
    liked.add(postId)
  }
  saveRaw(posts)
  saveLikedSet(liked)
  return { count: post.likes, isLiked: liked.has(postId) }
}

export function hasLiked(postId) {
  return getLikedSet().has(postId)
}

export function incrementPlay(postId) {
  const posts = getRaw()
  const post  = posts.find(p => p.id === postId)
  if (!post) return
  post.plays = (post.plays ?? 0) + 1
  saveRaw(posts)
}

// ─── Creator name persistence ─────────────────────────────────────────────────

export function getSavedCreatorName() {
  try { return localStorage.getItem(NAME_KEY) ?? '' } catch { return '' }
}

export function saveCreatorName(name) {
  try { localStorage.setItem(NAME_KEY, name.trim().slice(0, 30)) } catch {}
}

// ─── Backend (direct Supabase — works in local dev + Vercel) ─────────────────

function toyPayload(toy) {
  return {
    id:          toy.id,
    name:        toy.name,
    emoji:       toy.emoji,
    color:       toy.color,
    colorDark:   toy.colorDark    ?? null,
    colorLight:  toy.colorLight   ?? null,
    geometry:    toy.geometry,
    pitColor:    toy.pitColor     ?? null,
    hornColor:   toy.hornColor    ?? null,
    blushColor:  toy.blushColor   ?? null,
    earColor:    toy.earColor     ?? null,
    composition: toy.composition  ?? null,
    riseSpeed:   toy.riseSpeed    ?? DEFAULT_SPEED,
    speed:       toy.speed        ?? 'normal',
    faceExpression: toy.faceExpression ?? null,
    faceAngle:      toy.faceAngle      ?? null,
    faceElevation:  toy.faceElevation  ?? null,
    faceOffsetX:    toy.faceOffsetX    ?? null,
    faceOffsetY:    toy.faceOffsetY    ?? null,
    faceDir:        toy.faceDir        ?? null,
  }
}

function normalizePost(p) {
  const rawToy = p.toy_data ?? p.toy
  return {
    id:          p.id,
    toy:         rawToy ? hydrateToy(rawToy) : rawToy,
    creatorName: p.creator_name ?? p.creatorName ?? 'Anonymous',
    likes:       p.likes  ?? 0,
    plays:       p.plays  ?? 0,
    timestamp:   p.created_at ? new Date(p.created_at).getTime() : (p.timestamp ?? Date.now()),
  }
}

export async function fetchPosts() {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('id, creator_name, toy_data, likes, plays, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return (data ?? []).map(normalizePost)
  } catch {
    return getSortedPosts('newest')
  }
}

export async function submitPost(toy, creatorName) {
  try {
    const payload = compressToy(toyPayload(toy))
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        creator_name: (creatorName?.trim() || 'Anonymous').slice(0, 30),
        toy_data:     payload,
      })
      .select('id, creator_name, toy_data, likes, plays, created_at')
      .single()
    if (error) throw error
    return { ok: true, post: normalizePost(data) }
  } catch {
    addPost(toy, creatorName)
    return { ok: false }
  }
}

export async function remoteLike(postId, delta) {
  try {
    const { data: post } = await supabase
      .from('community_posts')
      .select('likes')
      .eq('id', postId)
      .single()
    if (!post) return null
    const newLikes = Math.max(0, post.likes + delta)
    const { data } = await supabase
      .from('community_posts')
      .update({ likes: newLikes })
      .eq('id', postId)
      .select('likes')
      .single()
    return data?.likes ?? null
  } catch { return null }
}

export async function remotePlay(postId) {
  try {
    const { data: post } = await supabase
      .from('community_posts')
      .select('plays')
      .eq('id', postId)
      .single()
    if (post) {
      await supabase
        .from('community_posts')
        .update({ plays: post.plays + 1 })
        .eq('id', postId)
    }
  } catch { /* fire-and-forget */ }
}
