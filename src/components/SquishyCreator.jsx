import { useState, useRef } from 'react'
import { CREATOR_COLORS, CREATOR_SHAPES, SPEED_PRESETS } from '../data/toys'
import MiniPreview from './MiniPreview'
import SculptStudio from './SculptStudio'
import { useLang } from '../lib/lang'

const FACE_TYPES = [
  { id: 'smile',     emoji: '😊', tk: 'face_smile' },
  { id: 'cry',       emoji: '😢', tk: 'face_cry'   },
  { id: 'dead',      emoji: '💀', tk: 'face_dead'  },
  { id: 'openmouth', emoji: '😮', tk: 'face_openmouth' },
  { id: 'none',      emoji: '⬜', tk: 'face_none'  },
]

const SPEEDS = [
  { id: 'slow',   labelKey: 'speed_slow',   descKey: 'speed_slow_desc' },
  { id: 'normal', labelKey: 'speed_normal', descKey: 'speed_normal_desc' },
  { id: 'bouncy', labelKey: 'speed_bouncy', descKey: 'speed_bouncy_desc' },
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

const LABEL = { fontSize: 11, fontWeight: 700, color: '#A07040', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }

function tabStyle(active) {
  return {
    flex: 1, padding: '7px 0', borderRadius: 10, cursor: 'pointer',
    border: active ? '2px solid #C68B4A' : '2px solid #E8D8C0',
    background: active ? '#FFF0D8' : 'white',
    fontFamily: "'Fredoka One', cursive", fontSize: 13,
    color: active ? '#7A4A18' : '#B09070',
    transition: 'all 0.15s',
  }
}

export default function SquishyCreator({ onAdd, onClose }) {
  const { t } = useLang()
  const [mode,           setMode]           = useState('preset')
  const [shape,          setShape]          = useState('sphere')
  const [color,          setColor]          = useState('#FF6B6B')
  const [speed,          setSpeed]          = useState('slow')
  const [name,           setName]           = useState('')
  const [faceExpression, setFaceExpression] = useState('smile')
  const studioRef = useRef()

  function handleAdd() {
    if (mode === 'sculpt') {
      const composition = studioRef.current?.getComposition() ?? []
      const face = studioRef.current?.getFaceSettings() ?? {}
      onAdd({
        id:          `custom_${Date.now()}`,
        name:        name.trim() || t('name_placeholder'),
        emoji:       '🎨',
        geometry:    'composed',
        composition,
        speed,
        riseSpeed:   SPEED_PRESETS[speed],
        color:       composition[0]?.color ?? '#FF9090',
        colorDark:   darken(composition[0]?.color ?? '#FF9090'),
        ...face,
      })
    } else {
      const shapeEmoji = CREATOR_SHAPES.find(s => s.id === shape)?.emoji ?? '🫧'
      onAdd({
        id:          `custom_${Date.now()}`,
        name:        name.trim() || t('name_placeholder'),
        emoji:       shapeEmoji,
        color,
        colorDark:   darken(color),
        colorLight:  lighten(color),
        geometry:    shape,
        customPositions: null,
        speed,
        riseSpeed:   SPEED_PRESETS[speed],
        faceExpression,
        faceDir: 'front',
        faceOffsetX: 0,
        faceOffsetY: 0,
      })
    }
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(120,70,10,0.28)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, padding: '0 16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#FFFDF7', borderRadius: '24px 24px 0 0', padding: '20px 24px 36px', width: '100%', maxWidth: 520, boxShadow: '0 -8px 40px rgba(120,70,10,0.18)', fontFamily: "'Nunito', sans-serif", maxHeight: '92vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: '#E0C89A' }} />
          <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: '#7A4A18', margin: 0 }}>{t('create_title')}</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #E8D8C0', background: 'white', cursor: 'pointer', fontSize: 16, color: '#A07040', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button style={tabStyle(mode==='preset')} onClick={() => setMode('preset')}>{t('preset_shape')}</button>
          <button style={tabStyle(mode==='sculpt')} onClick={() => setMode('sculpt')}>{t('sculpt_studio')}</button>
        </div>

        {/* ── PRESET MODE ── */}
        {mode === 'preset' && (<>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ width: 120, height: 120, flexShrink: 0, borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(135deg,#FFF9EC,#FFE8C0)', border: '2px solid #E8D8C0' }}>
              <MiniPreview geometry={shape} color={color} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={LABEL}>{t('name_it')}</label>
                <input type="text" placeholder={t('name_placeholder')} maxLength={14} value={name} onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '2px solid #E8D8C0', fontFamily: "'Fredoka One', cursive", fontSize: 15, color: '#7A4A18', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={LABEL}>{t('rise_speed')}</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {SPEEDS.map(s => (
                    <button key={s.id} onClick={() => setSpeed(s.id)} style={{ flex: 1, padding: '7px 4px', borderRadius: 10, border: speed===s.id?'2px solid #C68B4A':'2px solid #E8D8C0', background: speed===s.id?'#FFF0D8':'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <span style={{ fontSize: 13 }}>{t(s.labelKey)}</span>
                      <span style={{ fontSize: 9, color: '#C8A070' }}>{t(s.descKey)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <label style={LABEL}>{t('shape')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
            {CREATOR_SHAPES.map(s => (
              <button key={s.id} onClick={() => setShape(s.id)} style={{ padding: '8px 6px', borderRadius: 12, border: shape===s.id?'2px solid #C68B4A':'2px solid #E8D8C0', background: shape===s.id?'#FFF0D8':'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 20 }}>{s.emoji}</span>
                <span style={{ fontSize: 9, color: '#A07040', fontWeight: 700 }}>{s.label}</span>
              </button>
            ))}
          </div>

          <label style={LABEL}>{t('color')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,32px)', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            {CREATOR_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: color===c?'3px solid #7A4A18':'3px solid transparent', cursor: 'pointer', outline: color===c?'2px solid white':'none', outlineOffset: -4, transform: color===c?'scale(1.15)':'scale(1)', transition: 'transform 0.1s' }} />
            ))}
            <label style={{ position: 'relative', cursor: 'pointer', width: 32, height: 32 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)', border: '2px solid #E8D8C0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>＋</div>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
            </label>
          </div>

          <label style={LABEL}>{t('face')}</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            {FACE_TYPES.map(f => (
              <button key={f.id} onClick={() => setFaceExpression(f.id)} style={{
                flex: 1, padding: '6px 2px', borderRadius: 9,
                border: faceExpression===f.id ? '2px solid #C68B4A' : '2px solid #E8D8C0',
                background: faceExpression===f.id ? '#FFF0D8' : 'white',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                <span style={{ fontSize: 18 }}>{f.emoji}</span>
                <span style={{ fontSize: 8, color: '#A07040', fontWeight: 700 }}>{t(f.tk)}</span>
              </button>
            ))}
          </div>
        </>)}

        {/* ── SCULPT STUDIO MODE ── */}
        {mode === 'sculpt' && (<>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={LABEL}>{t('name_it')}</label>
                <input type="text" placeholder={t('name_placeholder')} maxLength={14} value={name} onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '2px solid #E8D8C0', fontFamily: "'Fredoka One', cursive", fontSize: 14, color: '#7A4A18', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={LABEL}>{t('rise_speed')}</label>
                <div style={{ display: 'flex', gap: 5 }}>
                  {SPEEDS.map(s => (
                    <button key={s.id} onClick={() => setSpeed(s.id)} style={{ flex: 1, padding: '6px 2px', borderRadius: 9, border: speed===s.id?'2px solid #C68B4A':'2px solid #E8D8C0', background: speed===s.id?'#FFF0D8':'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <span style={{ fontSize: 11 }}>{t(s.labelKey)}</span>
                      <span style={{ fontSize: 8, color: '#C8A070' }}>{t(s.descKey)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <SculptStudio ref={studioRef} />
        </>)}

        <button onClick={handleAdd}
          style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#C68B4A,#E8A96A)', color: 'white', fontFamily: "'Fredoka One', cursive", fontSize: 18, cursor: 'pointer', boxShadow: '0 4px 16px rgba(198,139,74,0.4)' }}
          onMouseDown={e => e.currentTarget.style.transform='scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
        >
          {t('add_to_shelf')}
        </button>
      </div>
    </div>
  )
}
