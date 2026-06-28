import { useMemo } from 'react'
import { useSpring, animated } from '@react-spring/three'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useSquishy, FACE } from '../hooks/useSquishy'

const AnimatedGroup = animated.group

// ── Face helpers ───────────────────────────────────────────────────────────

function Eye({ position, face }) {
  const scaleY = face === FACE.SQUISHING ? 0.12 : face === FACE.RISING ? 0.35 : 1
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.085, 12, 12]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
      <mesh position={[0.025, 0.03, 0.01]} scale={[0.5, scaleY, 0.5]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="white" roughness={0.1} />
      </mesh>
    </mesh>
  )
}

function Mouth({ face }) {
  const curve = useMemo(() => {
    if (face === FACE.SQUISHING) return new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.15, 0.02, 0), new THREE.Vector3(0, 0.12, 0), new THREE.Vector3(0.15, 0.02, 0))
    if (face === FACE.RISING)   return new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.1, -0.01, 0), new THREE.Vector3(0, 0.06, 0), new THREE.Vector3(0.1, -0.01, 0))
    return new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.13, 0.04, 0), new THREE.Vector3(0, -0.07, 0), new THREE.Vector3(0.13, 0.04, 0))
  }, [face])
  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 16, 0.022, 8, false), [curve])
  return <mesh geometry={tubeGeo}><meshStandardMaterial color="#1a1a1a" roughness={0.4} /></mesh>
}

function Blush({ position }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.1, 8, 4]} />
      <meshStandardMaterial color="#FF9999" transparent opacity={0.3} roughness={1} />
    </mesh>
  )
}

function Face({ face, faceZ = 0.88, scale = 1 }) {
  return (
    <group position={[0, 0.05, faceZ]} scale={scale}>
      <Eye position={[-0.2, 0.1, 0]} face={face} />
      <Eye position={[0.2, 0.1, 0]} face={face} />
      <Mouth face={face} />
      <Blush position={[-0.32, -0.04, 0]} />
      <Blush position={[0.32, -0.04, 0]} />
    </group>
  )
}

function DonutFace({ face }) {
  return (
    <group position={[0, 0.05, 0.42]} scale={0.62}>
      <Eye position={[-0.2, 0.18, 0]} face={face} />
      <Eye position={[0.2, 0.18, 0]} face={face} />
      <Mouth face={face} />
      <Blush position={[-0.3, 0.0, 0]} />
      <Blush position={[0.3, 0.0, 0]} />
    </group>
  )
}

// ── Bodies ─────────────────────────────────────────────────────────────────

function BlobBody({ toy }) {
  return <mesh castShadow><sphereGeometry args={[0.9, 32, 32]} /><meshStandardMaterial color={toy.color} roughness={0.85} /></mesh>
}

function BoxBody({ toy }) {
  return <RoundedBox args={[1.6, 1.2, 1.3]} radius={0.28} smoothness={4} castShadow><meshStandardMaterial color={toy.color} roughness={0.88} /></RoundedBox>
}

function TorusBody({ toy }) {
  return (
    <group>
      <mesh castShadow><torusGeometry args={[0.65, 0.38, 16, 40]} /><meshStandardMaterial color={toy.color} roughness={0.85} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.65, 0.22, 8, 40]} /><meshStandardMaterial color={toy.frostingColor || '#F7A8C4'} roughness={0.7} /></mesh>
    </group>
  )
}

function AvocadoBody({ toy }) {
  return (
    <group scale={[0.86, 1.35, 0.86]}>
      <mesh castShadow><sphereGeometry args={[0.9, 32, 32]} /><meshStandardMaterial color={toy.colorDark} roughness={0.85} /></mesh>
      <mesh scale={0.84}><sphereGeometry args={[0.9, 32, 32]} /><meshStandardMaterial color="#D4E88A" roughness={0.7} /></mesh>
      <mesh position={[0, 0.05, 0]}><sphereGeometry args={[0.32, 16, 16]} /><meshStandardMaterial color={toy.pitColor || '#5C3A1E'} roughness={0.85} /></mesh>
    </group>
  )
}

function UnicornBody({ toy }) {
  return (
    <group>
      <mesh castShadow><sphereGeometry args={[0.9, 32, 32]} /><meshStandardMaterial color={toy.color} roughness={0.8} /></mesh>
      <mesh position={[0, 1.3, 0.38]} rotation={[0.35, 0, 0]}><coneGeometry args={[0.11, 0.82, 8]} /><meshStandardMaterial color={toy.hornColor || '#FFD700'} roughness={0.2} metalness={0.7} /></mesh>
      <mesh position={[-0.58, 0.82, 0.18]} rotation={[0, 0, -0.45]}><coneGeometry args={[0.15, 0.42, 6]} /><meshStandardMaterial color={toy.colorDark} roughness={0.9} /></mesh>
      <mesh position={[0.58, 0.82, 0.18]} rotation={[0, 0, 0.45]}><coneGeometry args={[0.15, 0.42, 6]} /><meshStandardMaterial color={toy.colorDark} roughness={0.9} /></mesh>
      <mesh position={[-0.55, 0.82, 0.25]} rotation={[0, 0, -0.45]}><coneGeometry args={[0.08, 0.28, 6]} /><meshStandardMaterial color="#FFB6C1" roughness={0.9} /></mesh>
      <mesh position={[0.55, 0.82, 0.25]} rotation={[0, 0, 0.45]}><coneGeometry args={[0.08, 0.28, 6]} /><meshStandardMaterial color="#FFB6C1" roughness={0.9} /></mesh>
    </group>
  )
}

function CatBody({ toy, squished }) {
  const earDroop = squished ? 0.55 : 0
  return (
    <group>
      <mesh castShadow scale={[1.05, 0.95, 1.0]}><sphereGeometry args={[0.9, 32, 32]} /><meshStandardMaterial color={toy.color} roughness={0.85} /></mesh>
      <mesh position={[-0.62, 0.85, 0.1]} rotation={[0, 0, -0.28 - earDroop]}><coneGeometry args={[0.22, 0.58, 4]} /><meshStandardMaterial color={toy.colorDark} roughness={0.9} /></mesh>
      <mesh position={[0.62, 0.85, 0.1]} rotation={[0, 0, 0.28 + earDroop]}><coneGeometry args={[0.22, 0.58, 4]} /><meshStandardMaterial color={toy.colorDark} roughness={0.9} /></mesh>
      <mesh position={[-0.58, 0.84, 0.22]} rotation={[0, 0, -0.28 - earDroop]}><coneGeometry args={[0.12, 0.36, 4]} /><meshStandardMaterial color="#FFCCE0" roughness={0.9} /></mesh>
      <mesh position={[0.58, 0.84, 0.22]} rotation={[0, 0, 0.28 + earDroop]}><coneGeometry args={[0.12, 0.36, 4]} /><meshStandardMaterial color="#FFCCE0" roughness={0.9} /></mesh>
    </group>
  )
}

function ButterBody({ toy }) {
  return (
    <group>
      {/* Main block */}
      <RoundedBox args={[1.7, 0.9, 1.1]} radius={0.1} smoothness={4} castShadow>
        <meshStandardMaterial color={toy.color} roughness={0.75} metalness={0.05} />
      </RoundedBox>
      {/* Foil wrapper band */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.72, 0.3, 1.12]} />
        <meshStandardMaterial color={toy.foilColor || '#E8D44D'} roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Foil fold ends */}
      <mesh position={[0.87, 0, 0]}>
        <boxGeometry args={[0.04, 0.92, 1.12]} />
        <meshStandardMaterial color={toy.foilColor || '#E8D44D'} roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[-0.87, 0, 0]}>
        <boxGeometry args={[0.04, 0.92, 1.12]} />
        <meshStandardMaterial color={toy.foilColor || '#E8D44D'} roughness={0.3} metalness={0.4} />
      </mesh>
    </group>
  )
}

function ChocolateBody({ toy }) {
  return (
    <group>
      {/* Main bar */}
      <RoundedBox args={[1.55, 0.65, 1.15]} radius={0.09} smoothness={4} castShadow>
        <meshStandardMaterial color={toy.color} roughness={0.6} metalness={0.1} />
      </RoundedBox>
      {/* Segment ridges along X */}
      {[-0.5, 0, 0.5].map(x => (
        <mesh key={`x${x}`} position={[x, 0.33, 0]}>
          <boxGeometry args={[0.06, 0.06, 1.16]} />
          <meshStandardMaterial color={toy.colorDark} roughness={0.7} />
        </mesh>
      ))}
      {/* Segment ridges along Z */}
      {[-0.35, 0.35].map(z => (
        <mesh key={`z${z}`} position={[0, 0.33, z]}>
          <boxGeometry args={[1.56, 0.06, 0.06]} />
          <meshStandardMaterial color={toy.colorDark} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function StarBody({ toy }) {
  return <mesh castShadow><dodecahedronGeometry args={[0.9, 0]} /><meshStandardMaterial color={toy.color} roughness={0.7} metalness={0.1} /></mesh>
}

function ToyBody({ toy, squished }) {
  switch (toy.geometry) {
    case 'box':       return <BoxBody toy={toy} />
    case 'torus':     return <TorusBody toy={toy} />
    case 'avocado':   return <AvocadoBody toy={toy} />
    case 'unicorn':   return <UnicornBody toy={toy} />
    case 'cat':       return <CatBody toy={toy} squished={squished} />
    case 'butter':    return <ButterBody toy={toy} />
    case 'chocolate': return <ChocolateBody toy={toy} />
    case 'star':      return <StarBody toy={toy} />
    default:          return <BlobBody toy={toy} />
  }
}

function ToyFace({ geometry, face }) {
  switch (geometry) {
    case 'box':       return <Face face={face} faceZ={0.67} />
    case 'torus':     return <DonutFace face={face} />
    case 'avocado':   return <Face face={face} faceZ={0.78} scale={0.88} />
    case 'star':      return <Face face={face} faceZ={0.82} scale={0.9} />
    case 'butter':    return <Face face={face} faceZ={0.57} scale={0.75} />
    case 'chocolate': return <Face face={face} faceZ={0.60} scale={0.72} />
    default:          return <Face face={face} faceZ={0.88} />
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function SquishyToy3D({ toy, position = [0, 0, 0], onRisingChange }) {
  const { squished, mega, face, onPointerDown, onPointerUp } = useSquishy(toy, onRisingChange)

  const targetScaleY  = mega ? 0.14 : squished ? 0.30 : 1
  const targetScaleXZ = mega ? 1.75 : squished ? 1.48 : 1

  const { scaleY, scaleXZ } = useSpring({
    scaleY: targetScaleY,
    scaleXZ: targetScaleXZ,
    config: squished
      ? { tension: 900, friction: 30 }
      : { tension: toy.riseSpeed.tension, friction: toy.riseSpeed.friction, mass: toy.riseSpeed.mass },
  })

  return (
    <AnimatedGroup
      position={position}
      scale-x={scaleXZ}
      scale-y={scaleY}
      scale-z={scaleXZ}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <ToyBody toy={toy} squished={squished} />
      <ToyFace geometry={toy.geometry} face={face} />
    </AnimatedGroup>
  )
}
