import { useState, useRef, useCallback } from 'react'
import { playSquish, playRise, playPop, playMegaSquish } from '../SoundEngine'

export const FACE = { NORMAL: 'normal', SQUISHING: 'squishing', RISING: 'rising' }

// Estimate spring settle duration from tension/friction/mass
function estimateRiseDuration(riseSpeed) {
  const { tension, friction, mass } = riseSpeed
  return Math.max(800, Math.round((mass * friction * 1000) / tension))
}

export function useSquishy(toy, onRisingChange) {
  const [squished, setSquished] = useState(false)
  const [mega, setMega] = useState(false)
  const [face, setFace] = useState(FACE.NORMAL)
  const pressTimer = useRef(null)
  const riseTimer = useRef(null)

  const onPointerDown = useCallback((e) => {
    if (e.stopPropagation) e.stopPropagation()
    clearTimeout(pressTimer.current)
    clearTimeout(riseTimer.current)

    pressTimer.current = setTimeout(() => {
      setMega(true)
      playMegaSquish()
    }, 600)

    setSquished(true)
    setMega(false)
    setFace(FACE.SQUISHING)
    onRisingChange?.(false)
    playSquish()
  }, [toy, onRisingChange])

  const onPointerUp = useCallback(() => {
    clearTimeout(pressTimer.current)
    setSquished(false)
    setMega(false)
    setFace(FACE.RISING)

    const dur = estimateRiseDuration(toy.riseSpeed)
    onRisingChange?.(true, dur, toy.name)
    playRise(dur / 1000)

    riseTimer.current = setTimeout(() => {
      setFace(FACE.NORMAL)
      onRisingChange?.(false)
      playPop()
    }, dur)
  }, [toy, onRisingChange])

  return { squished, mega, face, onPointerDown, onPointerUp }
}
