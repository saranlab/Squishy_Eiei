import { useState, useEffect, useCallback } from 'react'
import {
  fetchPosts, submitPost, remoteLike, remotePlay,
  hasLiked, setLikedLocal, incrementPlay,
  getSavedCreatorName, saveCreatorName,
} from '../data/community'
import { useThumbnail } from '../lib/thumbnailService'
import SingleToyView from './SingleToyView'
import { useLang } from '../lib/lang'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

function timeAgo(ts, t) {
  const s = (Date.now() - ts) / 1000
  if (s < 60)    return t('just_now')
  if (s < 3600)  return t('m_ago', Math.floor(s / 60))
  if (s < 86400) return t('h_ago', Math.floor(s / 3600))
  return t('d_ago', Math.floor(s / 86400))
}

function useGrid() {
  const get = () => {
    const w = window.innerWidth
    if (w >= 1200) return { cols: 6, gap: 14 }
    if (w >= 960)  return { cols: 4, gap: 18 }
    if (w >= 600)  return { cols: 3, gap: 14 }
    return { cols: 2, gap: 10 }
  }
  const [grid, setGrid] = useState(get)
  useEffect(() => {
    const fn = () => setGrid(get())
    window.addEventListener('resize', fn, { passive: true })
    return () => window.removeEventListener('resize', fn)
  }, [])
  return grid
}

// ── Gradient fallback thumbnail ───────────────────────────────────────────────

function ToyThumb({ toy }) {
  const fc  = toy.geometry === 'composed' ? (toy.composition?.[0]?.color ?? '#FFB0B0') : null
  const bg1 = toy.colorLight || toy.color || fc || '#FFB0B0'
  const bg2 = toy.colorDark  || toy.color || fc || '#FF8080'
  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(circle at 34% 28%, ${bg1} 0%, ${bg2} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 'clamp(36px, 10vw, 60px)',
    }}>
      {toy.emoji || '🫧'}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

function SquishyCard({ post, onClick }) {
  const [hov, setHov] = useState(false)
  const thumb = useThumbnail(post.toy)
  const { t } = useLang()

  return (
    <article
      onClick={() => onClick(post)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        background: 'white',
        boxShadow: hov
          ? '0 18px 44px rgba(100,55,5,0.22)'
          : '0 4px 16px rgba(100,55,5,0.09)',
        transform: hov ? 'translateY(-6px) scale(1.025)' : 'translateY(0) scale(1)',
        transition: 'box-shadow 0.22s ease, transform 0.22s ease',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{ position: 'relative', paddingBottom: '100%', background: '#FFF9EC', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {thumb
            ? <img src={thumb} alt={post.toy.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <ToyThumb toy={post.toy} />
          }
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(30,14,2,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hov ? 1 : 0,
          transition: 'opacity 0.18s ease',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(255,255,255,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, boxShadow: '0 6px 20px rgba(0,0,0,0.28)',
            fontFamily: 'sans-serif',
          }}>▶</div>
        </div>
      </div>

      <div style={{ padding: '10px 12px 13px' }}>
        <div style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: 'clamp(12px, 3.5vw, 14px)', color: '#7A4A18',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: 2, lineHeight: 1.25,
        }}>{post.toy.name}</div>

        <div style={{ fontSize: 'clamp(10px, 2.5vw, 11px)', color: '#A07040', marginBottom: 6 }}>
          {t('by')} {post.creatorName}
        </div>

        <div style={{ display: 'flex', gap: 10, fontSize: 'clamp(10px, 2.5vw, 11px)', color: '#C8A070' }}>
          <span>❤️ {fmtNum(post.likes)}</span>
          <span>▶ {fmtNum(post.plays ?? 0)}</span>
        </div>
      </div>
    </article>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, posts, onCardClick }) {
  const { cols, gap } = useGrid()
  if (posts.length === 0) return null
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{
        fontFamily: "'Fredoka One', cursive",
        fontSize: 'clamp(16px, 4.5vw, 20px)', color: '#7A4A18',
        margin: '0 0 14px', lineHeight: 1.2,
      }}>{title}</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap,
      }}>
        {posts.map(post => (
          <SquishyCard key={post.id} post={post} onClick={onCardClick} />
        ))}
      </div>
    </section>
  )
}

// ── Detail page ───────────────────────────────────────────────────────────────

function SquishyDetail({ post: initPost, allPosts, onClose, onPlay, onNavigate }) {
  const [post,      setPost]      = useState(initPost)
  const [liked,     setLiked]     = useState(() => hasLiked(initPost.id))
  const [likeCount, setLikeCount] = useState(initPost.likes)
  const { cols, gap } = useGrid()
  const { t } = useLang()

  useEffect(() => {
    setPost(initPost)
    setLiked(hasLiked(initPost.id))
    setLikeCount(initPost.likes)
  }, [initPost.id])

  const related = allPosts.filter(p => p.id !== post.id).slice(0, cols * 2)

  function handleLike() {
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount(c => Math.max(0, c + (newLiked ? 1 : -1)))
    setLikedLocal(post.id, newLiked)
    remoteLike(post.id, newLiked ? 1 : -1)
  }

  function handlePlay() {
    incrementPlay(post.id)
    remotePlay(post.id)
    onPlay(post.toy)
  }

  function handleShare() {
    const text = `Check out "${post.toy.name}" by ${post.creatorName} on Squishy Simulator! 🫧`
    if (navigator.share) {
      navigator.share({ title: post.toy.name, text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text).catch(() => {})
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 70,
      background: 'linear-gradient(160deg, #FFF9EC 0%, #FFE8C4 100%)',
      overflowY: 'auto', fontFamily: "'Nunito', sans-serif",
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 2,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        background: 'rgba(255,253,247,0.92)', backdropFilter: 'blur(10px)',
        borderBottom: '1.5px solid #F0E4D0',
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '2px solid #E8D8C0', background: 'white',
          cursor: 'pointer', fontSize: 16, color: '#A07040',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>←</button>
        <span style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: 17, color: '#7A4A18',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{post.toy.name}</span>
      </div>

      <div style={{ height: 'clamp(260px, 44vw, 420px)', position: 'relative' }}>
        <SingleToyView key={post.id} toy={post.toy} waxed={false} />
      </div>

      <div style={{ padding: '18px 20px 0' }}>
        <h1 style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: 'clamp(22px, 6vw, 30px)', color: '#7A4A18',
          margin: '0 0 4px', lineHeight: 1.15,
        }}>{post.toy.name}</h1>

        <div style={{ fontSize: 13, color: '#A07040', marginBottom: 14 }}>
          {t('by')} <strong style={{ color: '#7A4A18' }}>{post.creatorName}</strong>
          <span style={{ color: '#C8A070', marginLeft: 8 }}>· {timeAgo(post.timestamp, t)}</span>
        </div>

        <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
          {[
            { icon: '❤️', value: fmtNum(likeCount), label: t('likes') },
            { icon: '▶',  value: fmtNum(post.plays ?? 0), label: t('plays') },
          ].map(({ icon, value, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 17 }}>{icon}</span>
              <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 16, color: '#7A4A18' }}>{value}</span>
              <span style={{ fontSize: 12, color: '#A07040' }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={handlePlay} style={{
            flex: '1 1 110px', padding: '12px 16px', borderRadius: 999,
            border: 'none',
            background: 'linear-gradient(135deg, #C68B4A 0%, #E8A96A 100%)',
            color: 'white',
            fontFamily: "'Fredoka One', cursive", fontSize: 15,
            cursor: 'pointer', boxShadow: '0 5px 16px rgba(198,139,74,0.42)',
          }}>{t('btn_play')}</button>

          <button onClick={handleLike} style={{
            flex: '1 1 110px', padding: '12px 16px', borderRadius: 999,
            border: `2px solid ${liked ? '#E84060' : '#E8D8C0'}`,
            background: liked ? '#FFF0F4' : 'white',
            color: liked ? '#E84060' : '#A07040',
            fontFamily: "'Fredoka One', cursive", fontSize: 15,
            cursor: 'pointer', transition: 'all 0.15s',
          }}>{liked ? t('btn_liked') : t('btn_like')}</button>

          <button onClick={handleShare} style={{
            flex: '1 1 110px', padding: '12px 16px', borderRadius: 999,
            border: '2px solid #E8D8C0', background: 'white',
            color: '#A07040',
            fontFamily: "'Fredoka One', cursive", fontSize: 15,
            cursor: 'pointer',
          }}>{t('btn_share')}</button>
        </div>
      </div>

      {related.length > 0 && (
        <div style={{ padding: '30px 20px 48px' }}>
          <h3 style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: 18, color: '#7A4A18', margin: '0 0 14px',
          }}>{t('related_title')}</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap,
          }}>
            {related.map(p => <SquishyCard key={p.id} post={p} onClick={onNavigate} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Share modal ───────────────────────────────────────────────────────────────

const BTN = {
  padding: '11px 20px', borderRadius: 999, border: '2px solid #C68B4A',
  background: 'linear-gradient(135deg, #C68B4A, #E8A96A)', color: 'white',
  fontFamily: "'Fredoka One', cursive", fontSize: 15,
  cursor: 'pointer', boxShadow: '0 4px 14px rgba(198,139,74,0.35)',
}

function ShareModal({ myToys, onDone, onClose }) {
  const [selected, setSelected] = useState(myToys[0] ?? null)
  const [name,     setName]     = useState(getSavedCreatorName)
  const [busy,     setBusy]     = useState(false)
  const [done,     setDone]     = useState(false)
  const { t } = useLang()

  const OVERLAY = {
    position: 'fixed', inset: 0, zIndex: 80,
    background: 'rgba(74,42,12,0.38)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  }
  const CARD = {
    width: '100%', maxWidth: 340,
    background: 'linear-gradient(160deg, #FFF9EC, #FFE8C4)',
    borderRadius: 24, padding: '28px 24px',
    border: '2px solid #E8D8C0', boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
    textAlign: 'center',
  }
  const fc  = selected?.geometry === 'composed' ? (selected.composition?.[0]?.color ?? '#FFB0B0') : null
  const bg1 = selected?.colorLight || selected?.color || fc || '#FFB0B0'
  const bg2 = selected?.colorDark  || selected?.color || fc || '#FF8080'

  if (myToys.length === 0) return (
    <div style={OVERLAY} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={CARD}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🫧</div>
        <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: '#7A4A18', margin: '0 0 8px' }}>
          {t('no_squishies_title')}
        </h3>
        <p style={{ fontSize: 13, color: '#A07040', margin: '0 0 18px' }}>
          {t('no_squishies_msg')}
        </p>
        <button onClick={onClose} style={BTN}>{t('got_it')}</button>
      </div>
    </div>
  )

  async function submit() {
    if (!selected || busy) return
    const trimmed = name.trim() || 'Anonymous'
    saveCreatorName(trimmed)
    setBusy(true)
    await submitPost(selected, trimmed)
    setBusy(false)
    setDone(true)
    onDone()
  }

  if (done) return (
    <div style={OVERLAY}>
      <div style={CARD}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🎉</div>
        <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: '#7A4A18', margin: '0 0 8px' }}>{t('shared_title')}</h3>
        <p style={{ fontSize: 13, color: '#A07040', margin: '0 0 18px' }}>{t('shared_msg')}</p>
        <button onClick={onClose} style={BTN}>{t('back_community')}</button>
      </div>
    </div>
  )

  return (
    <div style={OVERLAY} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={CARD}>
        <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: '#7A4A18', margin: '0 0 14px' }}>
          {t('share_title')}
        </h3>

        {myToys.length > 1 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#A07040', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, textAlign: 'left' }}>
              {t('choose_squishy')}
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {myToys.map(t => {
                const tfc  = t.geometry === 'composed' ? (t.composition?.[0]?.color ?? '#FFB0B0') : null
                const tbg1 = t.colorLight || t.color || tfc || '#FFB0B0'
                const tbg2 = t.colorDark  || t.color || tfc || '#FF8080'
                return (
                  <div key={t.id} onClick={() => setSelected(t)}
                    style={{ flexShrink: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      borderRadius: 12, padding: 3,
                      border: `2.5px solid ${selected?.id === t.id ? '#C68B4A' : 'transparent'}`,
                      transition: 'border-color 0.15s',
                    }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                        background: `radial-gradient(circle at 34% 28%, ${tbg1}, ${tbg2})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 26, boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                      }}>{t.emoji || '🫧'}</div>
                    </div>
                    <span style={{
                      fontSize: 10, color: selected?.id === t.id ? '#7A4A18' : '#B09070',
                      fontWeight: selected?.id === t.id ? 700 : 400,
                      maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{t.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 16 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 18,
              background: `radial-gradient(circle at 34% 28%, ${bg1}, ${bg2})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 34, boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            }}>{selected.emoji || '🫧'}</div>
            <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 14, color: '#A07040' }}>{selected.name}</span>
          </div>
        )}

        {/* Creator name */}
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A07040', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, textAlign: 'left' }}>
          {t('your_name')}
        </label>
        <input
          placeholder="Anonymous"
          maxLength={30}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          autoFocus
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 12,
            border: '2px solid #E8D8C0', fontFamily: "'Nunito', sans-serif",
            fontSize: 15, color: '#7A4A18', background: 'white',
            outline: 'none', boxSizing: 'border-box', marginBottom: 14,
          }}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ ...BTN, background: 'white', color: '#A07040', border: '2px solid #E8D8C0', boxShadow: 'none', flex: 1 }}>
            {t('cancel')}
          </button>
          <button
            onClick={submit}
            disabled={!selected || busy}
            style={{ ...BTN, flex: 2, opacity: (selected && !busy) ? 1 : 0.5 }}
          >
            {busy ? t('sharing') : t('share_btn')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main CommunityPage ────────────────────────────────────────────────────────

export default function CommunityPage({ onClose, myToys, onPlay, openShare = false }) {
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)
  const [sharing,  setSharing]  = useState(openShare)
  const [posts,    setPosts]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const { t } = useLang()

  const refresh = useCallback(async () => {
    setLoading(true)
    const data = await fetchPosts()
    setPosts(data)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const q = search.trim().toLowerCase()
  const filtered = q
    ? posts.filter(p =>
        p.toy.name?.toLowerCase().includes(q) ||
        p.creatorName?.toLowerCase().includes(q))
    : posts

  const now = Date.now()

  const topToday = [...filtered]
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 8)

  const trending = [...filtered]
    .sort((a, b) => {
      const hr = ms => Math.max(1, ms / 3_600_000)
      return (b.likes / hr(now - b.timestamp)) - (a.likes / hr(now - a.timestamp))
    })
    .slice(0, 8)

  const newest = [...filtered]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8)

  function handlePlay(toy) {
    onPlay({ ...toy, id: `play_${Date.now()}`, riseSpeed: toy.riseSpeed ?? { tension: 35, friction: 18, mass: 4 } })
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'linear-gradient(160deg, #FFF9EC 0%, #FFE8C4 100%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Nunito', sans-serif",
    }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px',
        borderBottom: '1.5px solid #F0E4D0',
        background: 'rgba(255,253,247,0.94)', backdropFilter: 'blur(10px)',
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '2px solid #E8D8C0', background: 'white',
          cursor: 'pointer', fontSize: 16, color: '#A07040',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>

        <h1 style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: 'clamp(18px, 5vw, 22px)', color: '#7A4A18',
          margin: 0,
        }}>🌍 {t('community')}</h1>

        <button onClick={() => setSharing(true)} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '7px 14px', borderRadius: 999,
          border: '2px solid #C68B4A',
          background: 'linear-gradient(135deg, #FFF0D8, #FFE0B0)',
          fontFamily: "'Fredoka One', cursive", fontSize: 13, color: '#7A4A18',
          cursor: 'pointer',
        }}>✨ {t('btn_share')}</button>
      </header>

      {/* Search */}
      <div style={{ padding: '10px 16px 6px', flexShrink: 0 }}>
        <input
          type="search"
          placeholder="🔍  Search squishies or creators…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '9px 14px', borderRadius: 12,
            border: '2px solid #E8D8C0', fontFamily: "'Nunito', sans-serif",
            fontSize: 13, color: '#7A4A18', background: 'white',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 40px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 10, animation: 'spin 1.2s linear infinite' }}>🫧</div>
            <p style={{ fontFamily: "'Fredoka One', cursive", fontSize: 16, color: '#A07040', margin: 0 }}>
              Loading squishies…
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>🫧</div>
            <p style={{ fontFamily: "'Fredoka One', cursive", fontSize: 18, color: '#A07040', margin: 0 }}>
              No squishies found
            </p>
          </div>
        ) : (<>
          <Section title="🏆 Top Today" posts={topToday} onCardClick={setSelected} />
          <Section title="🔥 Trending"  posts={trending}  onCardClick={setSelected} />
          <Section title="🆕 New"       posts={newest}    onCardClick={setSelected} />
        </>)}
      </div>

      {/* Detail overlay */}
      {selected && (
        <SquishyDetail
          post={selected}
          allPosts={posts}
          onClose={() => setSelected(null)}
          onPlay={handlePlay}
          onNavigate={setSelected}
        />
      )}

      {/* Share modal */}
      {sharing && (
        <ShareModal
          myToys={myToys ?? []}
          onDone={refresh}
          onClose={() => { setSharing(false); refresh() }}
        />
      )}
    </div>
  )
}
