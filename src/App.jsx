import { useState, useMemo } from 'react'
import SingleToyView from './components/SingleToyView'
import ToyPicker from './components/ToyPicker'
import SquishyCreator from './components/SquishyCreator'
import CommunityPage from './components/CommunityPage'
import { TOYS } from './data/toys'
import { compressToy, hydrateToy } from './lib/toyCompression'
import { LangContext, makeTFunc } from './lib/lang'

function loadCustomToys() {
  try {
    const raw = JSON.parse(localStorage.getItem('customToys') || '[]')
    return raw.map(t => hydrateToy(t))
  } catch { return [] }
}

function saveCustomToys(toys) {
  try {
    localStorage.setItem('customToys', JSON.stringify(toys.map(t => compressToy(t))))
  } catch { /* quota exceeded — silently skip */ }
}

const HAND_MOVES = [
  { style: 'poke',    emoji: '👆' },
  { style: 'squeeze', emoji: '🤏' },
  { style: 'palm',    emoji: '🖐' },
  { style: 'taps',    emoji: '✌️' },
  { style: 'knead',   emoji: '🤲' },
  { style: 'pancake', emoji: '🥞' },
]

export default function App() {
  const [customToys,    setCustomToys]    = useState(loadCustomToys)
  const [selectedToy,   setSelectedToy]   = useState(TOYS[0])
  const [creatorOpen,   setCreatorOpen]   = useState(false)
  const [communityOpen, setCommunityOpen] = useState(false)
  const [communityShare,setCommunityShare]= useState(false)
  const [pendingMove,   setPendingMove]   = useState(null)
  const [waxed,         setWaxed]         = useState(false)
  const [lang,          setLang]          = useState(() => localStorage.getItem('squishy_lang') || 'en')

  const t = useMemo(() => makeTFunc(lang), [lang])

  function toggleLang() {
    const next = lang === 'en' ? 'th' : 'en'
    setLang(next)
    localStorage.setItem('squishy_lang', next)
  }

  const allToys = [...TOYS, ...customToys]

  function handleSelectToy(toy) {
    setSelectedToy(toy)
    setPendingMove(null)
  }

  function handleAddToy(toy) {
    const next = [...customToys, toy]
    setCustomToys(next)
    saveCustomToys(next)
    setSelectedToy(toy)
  }

  function handlePlayCommunity(toy) {
    setSelectedToy(toy)
    setPendingMove(null)
  }

  function triggerMove(style) {
    setPendingMove({ style, id: Date.now() })
  }

  return (
    <LangContext.Provider value={{ lang, t }}>
      <div style={{
        height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'linear-gradient(160deg, #FFF9EC 0%, #FFE8C4 100%)',
        fontFamily: "'Nunito', sans-serif",
      }}>
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 16px 0', position: 'relative' }}>
          <h1 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 'clamp(22px, 5.5vw, 38px)', color: '#7A4A18', margin: 0, lineHeight: 1 }}>
            {t('title')}
          </h1>
          <button
            onClick={toggleLang}
            style={{
              position: 'absolute', right: 16,
              padding: '7px 14px', borderRadius: 999,
              border: '2px solid #C68B4A', background: 'white',
              fontFamily: "'Fredoka One', cursive", fontSize: 14, fontWeight: 700,
              color: '#7A4A18', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(198,139,74,0.15)',
            }}
          >
            🌐 {t('lang_toggle')}
          </button>
        </header>

        {/* Toy name */}
        <div style={{ textAlign: 'center', padding: '6px 0 0' }}>
          <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 'clamp(16px, 4vw, 20px)', color: '#A07040' }}>
            {selectedToy.emoji} {selectedToy.name}
          </span>
        </div>

        {/* 3D view — responsive height */}
        <div style={{ flex: '0 0 clamp(220px, 42dvh, 380px)', minHeight: 0 }}>
          <SingleToyView
            key={selectedToy.id}
            toy={selectedToy}
            pendingMove={pendingMove}
            waxed={waxed}
          />
        </div>

        {/* Invisible hand panel */}
        <div style={{ padding: '8px 12px 4px', flexShrink: 0 }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#C68B4A', letterSpacing: '0.18em', textTransform: 'uppercase', textAlign: 'center' }}>
            {t('invisible_hand')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, maxWidth: 560, width: '100%', margin: '0 auto' }}>
            {HAND_MOVES.map(m => (
              <button
                key={m.style}
                onClick={() => triggerMove(m.style)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  padding: '6px 8px', borderRadius: 12,
                  border: '2px solid #E8D8C0', background: 'white',
                  cursor: 'pointer', flex: '1 1 0', minWidth: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
                  transition: 'transform 0.1s',
                }}
                onPointerDown={e => e.currentTarget.style.transform = 'scale(0.91)'}
                onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
                onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span style={{ fontSize: 'clamp(16px,4vw,20px)', lineHeight: 1 }}>{m.emoji}</span>
                <span style={{ fontSize: 8, fontWeight: 700, color: '#A07040', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{t(m.style)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Toy picker */}
        <div style={{ padding: '8px 0 4px', flexShrink: 0 }}>
          <ToyPicker toys={allToys} selectedId={selectedToy.id} onSelect={handleSelectToy} />
        </div>

        {/* Create + Share buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '6px 16px 10px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              onClick={() => setCreatorOpen(true)}
              style={{
                padding: '8px 20px', borderRadius: 999, border: '2px solid #C68B4A',
                background: 'white', fontFamily: "'Fredoka One', cursive", fontSize: 14,
                color: '#7A4A18', cursor: 'pointer', boxShadow: '0 2px 8px rgba(198,139,74,0.15)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FFF0D8'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              {t('create_btn')}
            </button>
            <button
              onClick={() => { setCommunityShare(true); setCommunityOpen(true) }}
              style={{
                padding: '8px 18px', borderRadius: 999,
                border: '2px solid #C68B4A',
                background: 'linear-gradient(135deg,#FFF0D8,#FFE0B0)',
                fontFamily: "'Fredoka One', cursive", fontSize: 14,
                color: '#7A4A18', cursor: 'pointer', boxShadow: '0 2px 8px rgba(198,139,74,0.15)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FFE0B0'}
              onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg,#FFF0D8,#FFE0B0)'}
            >
              ✨ {t('btn_share')}
            </button>
          </div>
          {customToys.length > 0 && (
            <button
              onClick={() => { setCustomToys([]); localStorage.removeItem('customToys'); setSelectedToy(TOYS[0]) }}
              style={{ marginTop: 5, background: 'none', border: 'none', fontSize: 10, color: '#C8A070', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {t('clear_custom', customToys.length)}
            </button>
          )}
        </div>

        {creatorOpen && (
          <SquishyCreator onAdd={handleAddToy} onClose={() => setCreatorOpen(false)} />
        )}

        {/* Wax toggle — bottom right */}
        <button
          onClick={() => setWaxed(w => !w)}
          style={{
            position: 'fixed', right: 14, bottom: 14, zIndex: 50,
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '12px 20px', borderRadius: 999,
            border: `2px solid ${waxed ? '#C8A020' : '#C68B4A'}`,
            background: waxed ? 'linear-gradient(135deg,#FFF8C0,#FFE87A)' : 'white',
            fontFamily: "'Fredoka One', cursive", fontSize: 16,
            color: waxed ? '#7A5800' : '#7A4A18',
            cursor: 'pointer',
            boxShadow: waxed ? '0 4px 20px rgba(200,160,32,0.55)' : '0 4px 14px rgba(198,139,74,0.28)',
            transition: 'all 0.18s',
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>{waxed ? '✨' : '🕯️'}</span>
          {waxed ? t('waxed') : t('wax')}
        </button>

        {/* Community — bottom left */}
        <button
          onClick={() => setCommunityOpen(true)}
          style={{
            position: 'fixed', left: 14, bottom: 14, zIndex: 50,
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '12px 20px', borderRadius: 999,
            border: '2px solid #C68B4A', background: 'white',
            fontFamily: "'Fredoka One', cursive", fontSize: 16, color: '#7A4A18',
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(198,139,74,0.28)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#FFF0D8'}
          onMouseLeave={e => e.currentTarget.style.background = 'white'}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>🌍</span>
          {t('community')}
        </button>

        {communityOpen && (
          <CommunityPage
            myToys={customToys}
            onClose={() => { setCommunityOpen(false); setCommunityShare(false) }}
            onPlay={handlePlayCommunity}
            openShare={communityShare}
          />
        )}
      </div>
    </LangContext.Provider>
  )
}
