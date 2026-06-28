const POSTS_KEY = 'sq_community'
const LIKES_KEY  = 'sq_likes'

const DEFAULT_SPEED = { tension: 35, friction: 18, mass: 4 }

const SEEDS = [
  { id: 'seed_1', toy: { name: 'Fluffy Ball',  emoji: '🫧', geometry: 'sphere',    color: '#FF6B6B', colorDark: '#CC3C3C', colorLight: '#FFAAAA', riseSpeed: DEFAULT_SPEED }, creatorName: 'SquishFan',   likes: 24 },
  { id: 'seed_2', toy: { name: 'Avocado',      emoji: '🥑', geometry: 'avocado',   color: '#78B644', colorDark: '#4A7022', colorLight: '#AADE80', pitColor: '#7A4E28', riseSpeed: DEFAULT_SPEED }, creatorName: 'GreenThumb',  likes: 31 },
  { id: 'seed_3', toy: { name: 'Bread Loaf',   emoji: '🍞', geometry: 'bread',     color: '#E8C87A', colorDark: '#B89030', colorLight: '#F8E8AA', riseSpeed: DEFAULT_SPEED }, creatorName: 'BakeryLove',  likes: 18 },
  { id: 'seed_4', toy: { name: 'Choco Bar',    emoji: '🍫', geometry: 'chocolate', color: '#7A4228', colorDark: '#4A2210', colorLight: '#B07050', riseSpeed: { tension: 22, friction: 13, mass: 7 } }, creatorName: 'ChocoLover',  likes: 42 },
  { id: 'seed_5', toy: { name: 'Butter Block', emoji: '🧈', geometry: 'butter',    color: '#EDE8C0', colorDark: '#C4B870', colorLight: '#F8F5E0', riseSpeed: DEFAULT_SPEED }, creatorName: 'ButterMaker', likes: 15 },
  { id: 'seed_6', toy: { name: 'Unicorn',      emoji: '🦄', geometry: 'unicorn',   color: '#E8B0E0', colorDark: '#C070A0', colorLight: '#FFD8FF', riseSpeed: DEFAULT_SPEED }, creatorName: 'MagicMochi',  likes: 37 },
]

function init() {
  if (!localStorage.getItem(POSTS_KEY)) {
    const now = Date.now()
    const seeded = SEEDS.map((s, i) => ({ ...s, timestamp: now - (i + 1) * 1000 * 60 * 60 * (3 + i * 2) }))
    localStorage.setItem(POSTS_KEY, JSON.stringify(seeded))
  }
}

function getRaw() {
  try { return JSON.parse(localStorage.getItem(POSTS_KEY) || '[]') } catch { return [] }
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
      id: toy.id,
      name: toy.name,
      emoji: toy.emoji,
      color: toy.color,
      colorDark: toy.colorDark,
      colorLight: toy.colorLight,
      geometry: toy.geometry,
      pitColor:   toy.pitColor   ?? null,
      hornColor:  toy.hornColor  ?? null,
      blushColor: toy.blushColor ?? null,
      earColor:   toy.earColor   ?? null,
      composition: toy.composition ?? null,
      riseSpeed: toy.riseSpeed ?? DEFAULT_SPEED,
      speed: toy.speed ?? 'normal',
    },
    creatorName: (creatorName || 'Anonymous').trim().slice(0, 24),
    likes: 0,
    timestamp: Date.now(),
  }
  saveRaw([post, ...getRaw()])
  return post
}

export function toggleLike(postId) {
  const liked = getLikedSet()
  const posts = getRaw()
  const post = posts.find(p => p.id === postId)
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
