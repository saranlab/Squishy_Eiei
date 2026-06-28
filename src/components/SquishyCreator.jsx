import { useState } from 'react'
import { CREATOR_COLORS, CREATOR_SHAPES, SPEED_PRESETS } from '../data/toys'
import MiniPreview from './MiniPreview'

const SPEEDS = [
  { id: 'slow',   label: '🐌 Slooow', desc: '~4 sec' },
  { id: 'normal', label: '😐 Normal', desc: '~2 sec' },
  { id: 'bouncy', label: '🐇 Bouncy', desc: 'snap' },
]

function lighten(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, ((n >> 16) & 0xff) + 60)
  const g = Math.min(255, ((n >> 8) & 0xff) + 60)
  const b = Math.min(255, (n & 0xff) + 60)
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

function darken(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, ((n >> 16) & 0xff) - 50)
  const g = Math.max(0, ((n >> 8) & 0xff) - 50)
  const b = Math.max(0, (n & 0xff) - 50)
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

const label = { fontSize: 11, fontWeight: 700, color: '#A07040', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }

export default function SquishyCreator({ onAdd, onClose }) {
  const [shape, setShape] = useState('sphere')
  const [color, setColor] = useState('#FF6B6B')
  const [speed, setSpeed] = useState('slow')
  const [name, setName] = useState('')

  function handleAdd() {
    onAdd({
      id: `custom_${Date.now()}`,
      name: name.trim() || 'My Squishy',
      emoji: CREATOR_SHAPES.find(s => s.id === shape)?.emoji ?? '🫧',
      color,
      colorDark: darken(color),
      colorLight: lighten(color),
      geometry: shape,
      speed,
      riseSpeed: SPEED_PRESETS[speed],
    })
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(120,70,10,0.28)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, padding: '0 16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#FFFDF7', borderRadius: '24px 24px 0 0', padding: '20px 24px 36px', width: '100%', maxWidth: 520, boxShadow: '0 -8px 40px rgba(120,70,10,0.18)', fontFamily: "'Nunito', sans-serif", maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: '#E0C89A' }} />
          <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: '#7A4A18', margin: 0 }}>
            Create Your Squishy
          </h2>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #E8D8C0', background: 'white', cursor: 'pointer', fontSize: 16, color: '#A07040', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Preview + controls side by side on wide screens */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>

          {/* Live 3D preview */}
          <div style={{ width: 130, height: 130, flexShrink: 0, borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(135deg, #FFF9EC, #FFE8C0)', border: '2px solid #E8D8C0' }}>
            <MiniPreview geometry={shape} color={color} />
          </div>

          {/* Name + speed stacked */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={label}>Name it</label>
              <input
                type="text"
                placeholder="My Squishy"
                maxLength={14}
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '2px solid #E8D8C0', fontFamily: "'Fredoka One', cursive", fontSize: 15, color: '#7A4A18', background: 'white', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={label}>Rise Speed</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {SPEEDS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSpeed(s.id)}
                    style={{ flex: 1, padding: '7px 4px', borderRadius: 10, border: speed === s.id ? '2px solid #C68B4A' : '2px solid #E8D8C0', background: speed === s.id ? '#FFF0D8' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}
                  >
                    <span style={{ fontSize: 13 }}>{s.label}</span>
                    <span style={{ fontSize: 9, color: '#C8A070' }}>{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Shape */}
        <label style={label}>Shape</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {CREATOR_SHAPES.map(s => (
            <button
              key={s.id}
              onClick={() => setShape(s.id)}
              style={{ padding: '8px 6px', borderRadius: 12, border: shape === s.id ? '2px solid #C68B4A' : '2px solid #E8D8C0', background: shape === s.id ? '#FFF0D8' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
            >
              <span style={{ fontSize: 20 }}>{s.emoji}</span>
              <span style={{ fontSize: 9, color: '#A07040', fontWeight: 700 }}>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Color — fixed 6-col grid */}
        <label style={label}>Color</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 32px)', gap: 8, alignItems: 'center', marginBottom: 20 }}>
          {CREATOR_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: color === c ? '3px solid #7A4A18' : '3px solid transparent', cursor: 'pointer', outline: color === c ? '2px solid white' : 'none', outlineOffset: -4, transform: color === c ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.1s' }}
            />
          ))}
          <label style={{ position: 'relative', cursor: 'pointer', width: 32, height: 32 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)', border: '2px solid #E8D8C0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>＋</div>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
          </label>
        </div>

        {/* CTA */}
        <button
          onClick={handleAdd}
          style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #C68B4A, #E8A96A)', color: 'white', fontFamily: "'Fredoka One', cursive", fontSize: 18, cursor: 'pointer', boxShadow: '0 4px 16px rgba(198,139,74,0.4)' }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          Add to Shelf 🧸
        </button>
      </div>
    </div>
  )
}
