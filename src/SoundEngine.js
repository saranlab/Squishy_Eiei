import crunchWax   from '../sound/freesound_community-plastic-crunch-83779.mp3'
import crunchSquish from '../sound/photos-leaf-crunch-409641.mp3'

let ctx = null
let waxBuf    = null   // plastic-crunch  — full clip, play from 0
let squishBuf = null   // leaf-crunch     — good segment 0.5 s – 0.9 s

async function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') {
    await ctx.resume()
    try {
      const s = ctx.createBuffer(1, 1, ctx.sampleRate)
      const n = ctx.createBufferSource(); n.buffer = s
      n.connect(ctx.destination); n.start(0)
    } catch (_) {}
  }
  return ctx
}

async function load(url) {
  const c = await getCtx()
  const buf = await fetch(url).then(r => r.arrayBuffer())
  return c.decodeAudioData(buf)
}

// Preload both files immediately
Promise.all([
  load(crunchWax).then(b   => { waxBuf    = b }).catch(() => {}),
  load(crunchSquish).then(b => { squishBuf = b }).catch(() => {}),
])

function playBuf(buf, offset, dur, volume = 0.9) {
  getCtx().then(c => {
    const t = c.currentTime
    const src = c.createBufferSource()
    src.buffer = buf
    const gain = c.createGain()
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(volume, t + 0.008)
    gain.gain.setValueAtTime(volume, t + dur - 0.05)
    gain.gain.linearRampToValueAtTime(0, t + dur)
    src.connect(gain); gain.connect(c.destination)
    src.start(t, offset, dur)
  }).catch(() => {})
}

// ── Non-wax press — leaf crunch, segment 0.5 s → 0.9 s ──────────────────────
export async function playSquish() {
  if (squishBuf) { playBuf(squishBuf, 0.6, 0.3, 0.85); return }
  // synthesised fallback
  try {
    const c = await getCtx()
    const t = c.currentTime
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(180, t)
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12)
    const og = c.createGain()
    og.gain.setValueAtTime(0, t)
    og.gain.linearRampToValueAtTime(0.55, t + 0.010)
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.20)
    osc.connect(og); og.connect(c.destination)
    osc.start(t); osc.stop(t + 0.22)
    const nLen = Math.ceil(c.sampleRate * 0.16)
    const nBuf = c.createBuffer(1, nLen, c.sampleRate)
    const nd = nBuf.getChannelData(0)
    for (let i = 0; i < nLen; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nLen, 1.4)
    const noise = c.createBufferSource(); noise.buffer = nBuf
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'
    bp.frequency.value = 380; bp.Q.value = 1.1
    const ng = c.createGain()
    ng.gain.setValueAtTime(0.28, t)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
    noise.connect(bp); bp.connect(ng); ng.connect(c.destination)
    noise.start(t)
  } catch (_) {}
}

// ── Wax press crack — plastic crunch, full clip (≤ 0.7 s) ───────────────────
export async function playCrack() {
  if (waxBuf) { playBuf(waxBuf, 0, Math.min(waxBuf.duration, 0.7)); return }
  // synthesised fallback
  try {
    const c = await getCtx()
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
      const g = c.createGain()
      g.gain.setValueAtTime(0, t + delay)
      g.gain.linearRampToValueAtTime(0.11, t + delay + 0.003)
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.055)
      src.connect(bp); bp.connect(g); g.connect(c.destination)
      src.start(t + delay)
    }
  } catch (_) {}
}

export function playPop() {}
export function playRise() {}
export function playDeepSquish() {}
export function playMegaSquish() {}
