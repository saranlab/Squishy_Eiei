import { useState, useEffect, useCallback } from 'react'
import { getSortedPosts, addPost, toggleLike, hasLiked } from '../data/community'

// ─── Toy thumbnail (color bubble + emoji, no WebGL) ──────────────────────────

function ToyThumb({ toy, size = 72 }) {
  const firstPartColor = toy.geometry === 'composed' ? (toy.composition?.[0]?.color ?? '#FFB0B0') : null
  const bg  = toy.colorLight || toy.color || firstPartColor || '#FFB0B0'
  const bg2 = toy.colorDark  || toy.color || firstPartColor || '#FF8080'
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.25, flexShrink: 0,
      background: `radial-gradient(circle at 38% 32%, ${bg}, ${bg2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.46, boxShadow: '0 3px 10px rgba(0,0,0,0.13)',
      border: '2.5px solid rgba(255,255,255,0.55)',
    }}>
      {toy.emoji || '🫧'}
    </div>
  )
}

// ─── Time helper ─────────────────────────────────────────────────────────────

function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ─── Post card ───────────────────────────────────────────────────────────────

function PostCard({ post, onPlay, onChanged }) {
  const [liked,     setLiked]     = useState(() => hasLiked(post.id))
  const [likeCount, setLikeCount] = useState(post.likes)

  function handleLike() {
    const { count, isLiked } = toggleLike(post.id)
    setLiked(isLiked)
    setLikeCount(count)
    onChanged?.()
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'white', borderRadius: 20, padding: '13px 16px',
      boxShadow: '0 2px 10px rgba(120,70,10,0.07)',
      border: '1.5px solid #F0E4D0',
    }}>
      <ToyThumb toy={post.toy} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Fredoka One', cursive", fontSize: 16, color: '#7A4A18',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {post.toy.name}
        </div>
        <div style={{ fontSize: 11, color: '#A07040', marginTop: 2 }}>
          by <strong>{post.creatorName}</strong>
          <span style={{ color: '#C8A070', marginLeft: 6 }}>· {timeAgo(post.timestamp)}</span>
        </div>

        <div style={{ display: 'flex', gap: 7, marginTop: 9, flexWrap: 'wrap' }}>
          <button
            onClick={handleLike}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 99,
              border: `1.5px solid ${liked ? '#E84060' : '#E8D8C0'}`,
              background: liked ? '#FFF0F4' : 'white',
              color: liked ? '#E84060' : '#A07040',
              fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {liked ? '❤️' : '🤍'} {likeCount}
          </button>

          <button
            onClick={() => onPlay(post.toy)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 14px', borderRadius: 99,
              border: '1.5px solid #C68B4A',
              background: 'linear-gradient(135deg,#FFF0D8,#FFE0B0)',
              color: '#7A4A18',
              fontFamily: "'Fredoka One', cursive", fontSize: 13,
              cursor: 'pointer',
            }}
          >
            ▶ Play
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Share modal ─────────────────────────────────────────────────────────────

function ShareModal({ myToys, onDone, onClose }) {
  const [selected, setSelected] = useState(myToys[0] ?? null)
  const [name,     setName]     = useState('')
  const [done,     setDone]     = useState(false)

  const base = {
    position: 'fixed', inset: 0, zIndex: 80,
    background: 'rgba(74,42,12,0.38)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  }
  const card = {
    width: '100%', maxWidth: 340,
    background: 'linear-gradient(160deg,#FFF9EC,#FFE8C4)',
    borderRadius: 24, padding: '28px 24px',
    border: '2px solid #E8D8C0', boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
    textAlign: 'center',
  }

  if (myToys.length === 0) return (
    <div style={base} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={card}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🫧</div>
        <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: '#7A4A18', margin: '0 0 8px' }}>
          No squishies yet!
        </h3>
        <p style={{ fontSize: 13, color: '#A07040', margin: '0 0 18px' }}>
          Create a squishy first, then share it here.
        </p>
        <button onClick={onClose} style={btnStyle}>Got it</button>
      </div>
    </div>
  )

  function submit() {
    if (!selected) return
    addPost(selected, name)
    setDone(true)
    onDone()
  }

  if (done) return (
    <div style={base}>
      <div style={card}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🎉</div>
        <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: '#7A4A18', margin: '0 0 8px' }}>
          Shared!
        </h3>
        <p style={{ fontSize: 13, color: '#A07040', margin: '0 0 18px' }}>
          Your squishy is now in the community!
        </p>
        <button onClick={onClose} style={btnStyle}>Back to Community</button>
      </div>
    </div>
  )

  return (
    <div style={base} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={card}>
        <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: '#7A4A18', margin: '0 0 14px' }}>
          Share to Community 🌍
        </h3>

        {/* Picker — only shown when user has multiple squishies */}
        {myToys.length > 1 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#A07040', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, textAlign: 'left' }}>
              Choose a squishy
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
              {myToys.map(t => (
                <div key={t.id} onClick={() => setSelected(t)}
                  style={{ flexShrink: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    borderRadius: 12, padding: 3,
                    border: `2.5px solid ${selected?.id === t.id ? '#C68B4A' : 'transparent'}`,
                    transition: 'border-color 0.15s',
                  }}>
                    <ToyThumb toy={t} size={52} />
                  </div>
                  <span style={{
                    fontSize: 10, color: selected?.id === t.id ? '#7A4A18' : '#B09070',
                    fontWeight: selected?.id === t.id ? 700 : 400,
                    maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 16 }}>
            <ToyThumb toy={selected} size={72} />
            <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 14, color: '#A07040' }}>{selected.name}</span>
          </div>
        )}

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A07040', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, textAlign: 'left' }}>
          Your name
        </label>
        <input
          placeholder="Anonymous"
          maxLength={24}
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
          <button onClick={onClose} style={{ ...btnStyle, background: 'white', color: '#A07040', border: '2px solid #E8D8C0', flex: 1 }}>
            Cancel
          </button>
          <button onClick={submit} disabled={!selected} style={{ ...btnStyle, flex: 2, opacity: selected ? 1 : 0.5 }}>
            Share ✨
          </button>
        </div>
      </div>
    </div>
  )
}

const btnStyle = {
  padding: '11px 20px', borderRadius: 999, border: '2px solid #C68B4A',
  background: 'linear-gradient(135deg,#C68B4A,#E8A96A)', color: 'white',
  fontFamily: "'Fredoka One', cursive", fontSize: 15,
  cursor: 'pointer', boxShadow: '0 4px 14px rgba(198,139,74,0.35)',
}

// ─── Sort tab button ──────────────────────────────────────────────────────────

function SortBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '7px 4px', borderRadius: 10, cursor: 'pointer',
      border: active ? '2px solid #C68B4A' : '2px solid #E8D8C0',
      background: active ? '#FFF0D8' : 'white',
      fontFamily: "'Fredoka One', cursive", fontSize: 12,
      color: active ? '#7A4A18' : '#B09070',
      transition: 'all 0.13s',
    }}>
      {children}
    </button>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onShare }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ fontSize: 52, marginBottom: 10 }}>🌸</div>
      <p style={{ fontFamily: "'Fredoka One', cursive", fontSize: 17, color: '#A07040', margin: '0 0 6px' }}>
        No squishies yet!
      </p>
      <p style={{ fontSize: 12, color: '#C8A070', margin: '0 0 18px' }}>
        Be the first to share one.
      </p>
      <button onClick={onShare} style={{ ...btnStyle, fontSize: 14 }}>
        ✨ Share Yours
      </button>
    </div>
  )
}

// ─── Main Community Page ──────────────────────────────────────────────────────

export default function CommunityPage({ onClose, myToys, onPlay }) {
  const [sort,    setSort]    = useState('likes')
  const [search,  setSearch]  = useState('')
  const [posts,   setPosts]   = useState([])
  const [sharing, setSharing] = useState(false)

  const refresh = useCallback(() => {
    setPosts(getSortedPosts(sort, search))
  }, [sort, search])

  useEffect(() => { refresh() }, [refresh])

  function handlePlay(toy) {
    onPlay({ ...toy, id: `play_${Date.now()}`, riseSpeed: toy.riseSpeed ?? { tension: 35, friction: 18, mass: 4 } })
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'linear-gradient(160deg,#FFF9EC 0%,#FFE8C4 100%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Nunito', sans-serif",
    }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 18px 12px',
        borderBottom: '1.5px solid #F0E4D0',
        background: 'rgba(255,253,247,0.92)', backdropFilter: 'blur(8px)',
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '2px solid #E8D8C0', background: 'white',
          cursor: 'pointer', fontSize: 16, color: '#A07040',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>

        <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: '#7A4A18', margin: 0 }}>
          🌍 Community
        </h2>

        <button
          onClick={() => setSharing(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 999,
            border: '2px solid #C68B4A',
            background: 'linear-gradient(135deg,#FFF0D8,#FFE0B0)',
            fontFamily: "'Fredoka One', cursive", fontSize: 13, color: '#7A4A18',
            cursor: 'pointer',
          }}
        >
          ✨ Share
        </button>
      </div>

      {/* ── Controls ── */}
      <div style={{ padding: '12px 16px 8px', flexShrink: 0 }}>
        <input
          type="search"
          placeholder="🔍  Search squishies or creators…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '9px 14px', borderRadius: 12,
            border: '2px solid #E8D8C0', fontFamily: "'Nunito', sans-serif",
            fontSize: 13, color: '#7A4A18', background: 'white',
            outline: 'none', boxSizing: 'border-box', marginBottom: 10,
          }}
        />
        <div style={{ display: 'flex', gap: 7 }}>
          <SortBtn active={sort === 'likes'}    onClick={() => setSort('likes')}>🏆 Top</SortBtn>
          <SortBtn active={sort === 'newest'}   onClick={() => setSort('newest')}>🆕 New</SortBtn>
          <SortBtn active={sort === 'trending'} onClick={() => setSort('trending')}>🔥 Hot</SortBtn>
        </div>
      </div>

      {/* ── Post list ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {posts.length === 0 ? (
          <EmptyState onShare={() => setSharing(true)} />
        ) : (
          posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onPlay={handlePlay}
              onChanged={refresh}
            />
          ))
        )}
      </div>

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
