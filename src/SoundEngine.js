let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Squishy foam press — soft rubbery thud + air-escape noise ~200ms
export function playSquish() {
  try {
    const c = getCtx()
    const t = c.currentTime

    // Low body thud: pitch drops like foam compressing
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(180, t)
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12)
    const oscGain = c.createGain()
    oscGain.gain.setValueAtTime(0, t)
    oscGain.gain.linearRampToValueAtTime(0.55, t + 0.010)
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.20)
    osc.connect(oscGain); oscGain.connect(c.destination)
    osc.start(t); osc.stop(t + 0.22)

    // Soft noise burst: air squeezing out of the foam
    const nLen = Math.ceil(c.sampleRate * 0.16)
    const nBuf = c.createBuffer(1, nLen, c.sampleRate)
    const nd = nBuf.getChannelData(0)
    for (let i = 0; i < nLen; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nLen, 1.4)
    const noise = c.createBufferSource(); noise.buffer = nBuf
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'
    bp.frequency.value = 380; bp.Q.value = 1.1
    const noiseGain = c.createGain()
    noiseGain.gain.setValueAtTime(0.28, t)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
    noise.connect(bp); bp.connect(noiseGain); noiseGain.connect(c.destination)
    noise.start(t)
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
