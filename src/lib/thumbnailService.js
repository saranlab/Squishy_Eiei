// Singleton Three.js renderer — one WebGL context shared across all thumbnail requests.
// Processes toys one-at-a-time from a queue and caches dataURLs by toy id.
import * as THREE from 'three'
import { useState, useEffect } from 'react'

let _r = null  // WebGLRenderer
let _s = null  // Scene
let _c = null  // Camera

function boot() {
  if (_r) return
  _r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  _r.setSize(280, 280)
  _r.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  _r.setClearColor(new THREE.Color('#FFF9EC'), 1)

  _s = new THREE.Scene()
  _s.background = new THREE.Color('#FFF9EC')
  _s.add(new THREE.AmbientLight('#ffffff', 1.5))
  const key  = new THREE.DirectionalLight('#ffffff', 1.2)
  key.position.set(3, 5, 4); _s.add(key)
  const fill = new THREE.DirectionalLight('#fff4e8', 0.45)
  fill.position.set(-2, -1, 3); _s.add(fill)
  const rim  = new THREE.DirectionalLight('#e8f4ff', 0.25)
  rim.position.set(0, -4, -3); _s.add(rim)

  _c = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
  _c.position.set(0, 0, 2.75)
  _c.lookAt(0, 0, 0)
}

function disposeMesh(obj) {
  obj.traverse(o => {
    o.geometry?.dispose()
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      mats.forEach(m => m.dispose())
    }
  })
}

// ── Geometry builders (simplified from DeformableToy for thumbnail rendering) ──

function buildObj(toy) {
  if (toy.geometry === 'composed' && toy.composition?.length) {
    const group = new THREE.Group()
    toy.composition.forEach(part => {
      const geo = new THREE.SphereGeometry(0.56, 14, 10)
      const mat = new THREE.MeshStandardMaterial({ color: part.color ?? '#FFB0B0', roughness: 0.5 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.scale.setScalar(part.partScale ?? 1)
      mesh.position.set(
        (part.transform?.x ?? 0) * 0.54,
        (part.transform?.y ?? 0) * 0.54,
        (part.transform?.z ?? 0) * 0.54,
      )
      group.add(mesh)
    })
    // Auto-fit composition into camera frustum
    const box = new THREE.Box3().setFromObject(group)
    const sz  = new THREE.Vector3(); box.getSize(sz)
    const max = Math.max(sz.x, sz.y, sz.z)
    if (max > 1.8) group.scale.setScalar(1.8 / max)
    return group
  }

  let geo
  switch (toy.geometry) {
    case 'box': case 'chonk':
      geo = new THREE.BoxGeometry(1.52, 1.06, 0.92); break
    case 'torus':
      geo = new THREE.TorusGeometry(0.58, 0.35, 12, 28); break
    case 'butter':
      geo = new THREE.BoxGeometry(2.1, 0.64, 0.40); break
    case 'bread': {
      const g = new THREE.SphereGeometry(1, 18, 14)
      const p = g.attributes.position
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i), y = p.getY(i), z = p.getZ(i)
        x *= 1.52; z *= 0.82
        y = y < 0 ? y * 0.52 : y * 0.86 + 0.09
        p.setXYZ(i, x, y, z)
      }
      p.needsUpdate = true; g.computeVertexNormals(); geo = g; break
    }
    case 'avocado': {
      const g = new THREE.SphereGeometry(1, 18, 14)
      const p = g.attributes.position
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
        const t = (y + 1) / 2
        const r = t < 0.3
          ? 1.0 + 0.18 * Math.sin(t / 0.3 * Math.PI)
          : 1.18 - 0.72 * Math.pow((t - 0.3) / 0.7, 0.6)
        p.setXYZ(i, x * r, y * 1.28, z * r)
      }
      p.needsUpdate = true; g.computeVertexNormals(); geo = g; break
    }
    case 'chocolate':
      geo = new THREE.BoxGeometry(1.85, 1.15, 0.34); break
    default:
      geo = new THREE.SphereGeometry(0.94, 18, 14)
  }

  const roughMap = { butter: 0.86, chocolate: 0.86, bread: 0.78, box: 0.55, chonk: 0.55 }
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color:     toy.color ?? '#FFB0B0',
    roughness: roughMap[toy.geometry] ?? 0.46,
    metalness: 0.02,
  }))
}

// ── Queue ─────────────────────────────────────────────────────────────────────

const cache = new Map()  // toyId → dataURL
const pend  = new Map()  // toyId → { toy, cbs: Set }
const queue = []
let   busy  = false

function pump() {
  if (busy || queue.length === 0) return
  busy = true

  const id    = queue.shift()
  const entry = pend.get(id)
  pend.delete(id)

  if (!entry) { busy = false; pump(); return }

  boot()

  // Remove previous toy objects
  const dead = []
  _s.traverse(o => { if (o.userData.thumb) dead.push(o) })
  dead.forEach(o => { disposeMesh(o); _s.remove(o) })

  const obj = buildObj(entry.toy)
  obj.userData.thumb = true
  _s.add(obj)

  _r.render(_s, _c)
  const url = _r.domElement.toDataURL('image/jpeg', 0.86)
  cache.set(id, url)
  entry.cbs.forEach(cb => cb(url))

  busy = false
  setTimeout(pump, 0)  // yield between renders so the browser can paint
}

export function requestThumbnail(toy, cb) {
  if (!toy?.id) return
  if (cache.has(toy.id)) { cb(cache.get(toy.id)); return }
  if (!pend.has(toy.id)) {
    pend.set(toy.id, { toy, cbs: new Set() })
    queue.push(toy.id)
  }
  pend.get(toy.id).cbs.add(cb)
  pump()
}

// React hook — returns null while loading, dataURL once ready
export function useThumbnail(toy) {
  const [url, setUrl] = useState(() => cache.get(toy?.id) ?? null)
  useEffect(() => {
    if (!toy?.id) return
    if (cache.has(toy.id)) { setUrl(cache.get(toy.id)); return }
    let alive = true
    requestThumbnail(toy, u => { if (alive) setUrl(u) })
    return () => { alive = false }
  }, [toy?.id])
  return url
}
