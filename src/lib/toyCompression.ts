// Quantizes Float32 arrays → Int16 → base64 string, and back.
// Used for `positions` and `vertexColors` inside composition parts before uploading.
// Reduces sculpted toy JSON size by ~75% while keeping visual accuracy to ~0.00006 per vertex.

export interface QuantizedBlob {
  data:   string  // base64-encoded Int16Array
  min:    number  // original min — used to rebuild float range
  max:    number  // original max
  length: number  // original element count (sanity check on decode)
}

const INT16_RANGE = 65535 // maps 0..1 float to -32768..32767 Int16

export function quantizeFloatArray(floats: number[]): QuantizedBlob {
  if (floats.length === 0) return { data: '', min: 0, max: 0, length: 0 }

  let min = floats[0], max = floats[0]
  for (let i = 1; i < floats.length; i++) {
    if (floats[i] < min) min = floats[i]
    if (floats[i] > max) max = floats[i]
  }
  const range = max - min || 1

  const int16 = new Int16Array(floats.length)
  for (let i = 0; i < floats.length; i++) {
    const normalized = (floats[i] - min) / range        // 0..1
    int16[i] = Math.round(normalized * INT16_RANGE - 32768) // -32768..32767
  }

  return { data: bytesToBase64(new Uint8Array(int16.buffer)), min, max, length: floats.length }
}

export function dequantizeFloatArray(blob: QuantizedBlob): number[] {
  if (blob.length === 0) return []
  const bytes  = base64ToBytes(blob.data)
  const int16  = new Int16Array(bytes.buffer)
  const range  = blob.max - blob.min || 1
  const floats = new Array<number>(blob.length)
  for (let i = 0; i < blob.length; i++) {
    const normalized = (int16[i] + 32768) / INT16_RANGE  // back to 0..1
    floats[i] = blob.min + normalized * range
  }
  return floats
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// ── Helpers used by community.js ─────────────────────────────────────────────

type AnyPart = {
  positions?:    number[] | QuantizedBlob | null
  vertexColors?: number[] | QuantizedBlob | null
  _quantized?:   boolean
  [key: string]: unknown
}

export function compressToy(toy: Record<string, unknown>): Record<string, unknown> {
  if (toy.geometry !== 'composed' || !Array.isArray(toy.composition)) return toy
  return {
    ...toy,
    composition: (toy.composition as AnyPart[]).map(part => {
      if (part._quantized) return part  // already compressed
      const positions    = Array.isArray(part.positions)    ? quantizeFloatArray(part.positions)    : part.positions
      const vertexColors = Array.isArray(part.vertexColors) ? quantizeFloatArray(part.vertexColors) : part.vertexColors
      return { ...part, positions, vertexColors, _quantized: true }
    }),
  }
}

export function hydrateToy(toy: Record<string, unknown>): Record<string, unknown> {
  if (toy.geometry !== 'composed' || !Array.isArray(toy.composition)) return toy
  return {
    ...toy,
    composition: (toy.composition as AnyPart[]).map(part => {
      if (!part._quantized) return part  // old format — plain arrays, use as-is
      const positions    = part.positions    && !Array.isArray(part.positions)    ? dequantizeFloatArray(part.positions    as QuantizedBlob) : part.positions
      const vertexColors = part.vertexColors && !Array.isArray(part.vertexColors) ? dequantizeFloatArray(part.vertexColors as QuantizedBlob) : part.vertexColors
      return { ...part, positions, vertexColors, _quantized: false }
    }),
  }
}
