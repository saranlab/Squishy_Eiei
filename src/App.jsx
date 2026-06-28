import { useState, useCallback } from 'react'
import SingleToyView from './components/SingleToyView'
import ToyPicker from './components/ToyPicker'
import SlownessBar from './components/SlownessBar'
import SquishyCreator from './components/SquishyCreator'
import { TOYS, SPEED_PRESETS } from './data/toys'

function loadCustomToys() {
  try { return JSON.parse(localStorage.getItem('customToys') || '[]') } catch { return [] }
}

const HAND_MOVES = [
  { style: 'poke',    label: 'Poke',    emoji: '👆' },
  { style: 'squeeze', label: 'Squeeze', emoji: '🤏' },
  { style: 'palm',    label: 'Palm',    emoji: '🖐' },
  { style: 'taps',    label: 'Taps',    emoji: '✌️' },
  { style: 'knead',   label: 'Knead',   emoji: '🤲' },
  { style: 'pancake', label: 'Pancake', emoji: '🥞' },
]

export default function App() {
  const [customToys, setCustomToys] = useState(loadCustomToys)
  const [selectedToy, setSelectedToy] = useState(TOYS[0])
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [risingState, setRisingState] = useState({ active: false, duration: 0, toyName: '' })
  const [pendingMove, setPendingMove] = useState(null)

  const allToys = [...TOYS, ...customToys]

  const handleFaceChange = useCallback((faceState) => {
    if (faceState === 'rising') {
      const { tension, friction, mass } = selectedToy.riseSpeed
      const dur = Math.max(1000, Math.round((mass * friction * 1200) / tension))
      setRisingState({ active: true, duration: dur, toyName: selectedToy.name })
    } else {
      setRisingState(s => ({ ...s, active: false }))
    }
  }, [selectedToy])

  function handleSelectToy(toy) {
    setSelectedToy(toy)
    setRisingState({ active: false, duration: 0, toyName: '' })
    setPendingMove(null)
  }

  function handleAddToy(toy) {
    const next = [...customToys, toy]
    setCustomToys(next)
    localStorage.setItem('customToys', JSON.stringify(next))
    setSelectedToy(toy)
  }

  function triggerMove(style) {
    setPendingMove({ style, id: Date.now() })
  }

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: 'linear-gradient(160deg, #FFF9EC 0%, #FFE8C4 100%)',
      fontFamily: "'Nunito', sans-serif",
    }}>
      {/* Header */}
      <header style={{ textAlign: 'center', padding: '18px 16px 0' }}>
        <h1 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 'clamp(24px, 6vw, 42px)', color: '#7A4A18', margin: 0, lineHeight: 1 }}>
          Squishy Simulator
        </h1>
      </header>

      {/* Toy name */}
      <div style={{ textAlign: 'center', padding: '8px 0 0' }}>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: '#A07040' }}>
          {selectedToy.emoji} {selectedToy.name}
        </span>
      </div>

      {/* 3D view */}
      <div style={{ height: 'min(52vw, 340px)', minHeight: 240 }}>
        <SingleToyView
          key={selectedToy.id}
          toy={selectedToy}
          onFaceChange={handleFaceChange}
          pendingMove={pendingMove}
        />
      </div>

      {/* Slowness bar */}
      <SlownessBar
        rising={risingState.active}
        duration={risingState.duration}
        toyName={risingState.toyName}
      />

      {/* Invisible hand panel */}
      <div style={{ padding: '10px 16px 6px' }}>
        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#C68B4A', letterSpacing: '0.18em', textTransform: 'uppercase', textAlign: 'center' }}>
          Invisible Hand
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {HAND_MOVES.map(m => (
            <button
              key={m.style}
              onClick={() => triggerMove(m.style)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '8px 10px', borderRadius: 14,
                border: '2px solid #E8D8C0', background: 'white',
                cursor: 'pointer', minWidth: 52,
                boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
                transition: 'transform 0.1s, background 0.1s',
              }}
              onPointerDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
              onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{m.emoji}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#A07040', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toy picker */}
      <div style={{ padding: '10px 0 6px' }}>
        <ToyPicker toys={allToys} selectedId={selectedToy.id} onSelect={handleSelectToy} />
      </div>

      {/* Create button */}
      <div style={{ textAlign: 'center', padding: '8px 16px 12px' }}>
        <button
          onClick={() => setCreatorOpen(true)}
          style={{
            padding: '9px 22px', borderRadius: 999, border: '2px solid #C68B4A',
            background: 'white', fontFamily: "'Fredoka One', cursive", fontSize: 14,
            color: '#7A4A18', cursor: 'pointer', boxShadow: '0 2px 8px rgba(198,139,74,0.15)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#FFF0D8'}
          onMouseLeave={e => e.currentTarget.style.background = 'white'}
        >
          ＋ Create Your Squishy
        </button>
        {customToys.length > 0 && (
          <button
            onClick={() => { setCustomToys([]); localStorage.removeItem('customToys'); setSelectedToy(TOYS[0]) }}
            style={{ display: 'block', margin: '6px auto 0', background: 'none', border: 'none', fontSize: 10, color: '#C8A070', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Clear custom squishies ({customToys.length})
          </button>
        )}
      </div>

      {creatorOpen && (
        <SquishyCreator onAdd={handleAddToy} onClose={() => setCreatorOpen(false)} />
      )}
    </div>
  )
}
