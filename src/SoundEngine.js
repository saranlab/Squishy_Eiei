let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Press feedback only — soft foam thud ~250ms
export function playSquish() {
  try {
    const c = getCtx()
    const t = c.currentTime
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(100, t)
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.22)
    const gain = c.createGain()
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.32, t + 0.014)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 420
    osc.connect(lp); lp.connect(gain); gain.connect(c.destination)
    osc.start(t); osc.stop(t + 0.26)
  } catch (_) {}
}

// ASMR wax/ice crack — rapid micro-bursts of high-frequency noise
export function playCrack() {
  try {
    const c = getCtx()
    const t = c.currentTime
    const len = Math.ceil(c.sampleRate * 0.06)
    for (let i = 0; i < 5; i++) {
      const delay = i * 0.016
      const buf = c.createBuffer(1, len, c.sampleRate)
      const d = buf.getChannelData(0)
      for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, 2)
      const src = c.createBufferSource(); src.buffer = buf
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'
      bp.frequency.value = 1800 + Math.random() * 2000; bp.Q.value = 2.5
      const gain = c.createGain()
      gain.gain.setValueAtTime(0, t + delay)
      gain.gain.linearRampToValueAtTime(0.11, t + delay + 0.003)
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.055)
      src.connect(bp); bp.connect(gain); gain.connect(c.destination)
      src.start(t + delay)
    }
  } catch (_) {}
}

// No-ops
export function playPop() {}
export function playRise() {}
export function playDeepSquish() {}
export function playMegaSquish() {}
