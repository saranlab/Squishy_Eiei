import { useEffect, useState, useRef } from 'react'

const MESSAGES = [
  'Rising…',
  'Still rising…',
  'Taking its time…',
  'Any century now…',
  'This is normal…',
  'Almost there… maybe…',
  'Foam gonna foam…',
  'We believe in you, little guy…',
]

export default function SlownessBar({ rising, duration, toyName }) {
  const [progress, setProgress] = useState(0)
  const [msgIndex, setMsgIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const rafRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    if (rising && duration) {
      setVisible(true)
      setProgress(0)
      setMsgIndex(0)
      startRef.current = performance.now()

      const tick = (now) => {
        const elapsed = now - startRef.current
        const pct = Math.min(elapsed / duration, 1)
        setProgress(pct)
        setMsgIndex(Math.min(Math.floor(pct * MESSAGES.length), MESSAGES.length - 1))
        if (pct < 1) rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(rafRef.current)
      if (visible) {
        setProgress(1)
        setTimeout(() => setVisible(false), 500)
      }
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [rising, duration])

  if (!visible) return null

  const pct = Math.round(progress * 100)
  const msg = progress >= 1 ? 'Done! ✨' : MESSAGES[msgIndex]

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '10px 24px 0', fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#A07040' }}>
          {toyName && <span style={{ color: '#C68B4A' }}>{toyName} · </span>}
          {msg}
        </span>
        <span style={{ fontSize: 12, color: '#C8A070', fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: 'rgba(198,139,74,0.18)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: '100%', borderRadius: 99,
          background: 'linear-gradient(90deg, #C68B4A, #E8A96A)',
          transform: `scaleX(${progress})`,
          transformOrigin: 'left center',
          transition: 'transform 0.1s linear',
        }} />
      </div>
    </div>
  )
}
