import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import DeformableToy from './DeformableToy'

export default function SingleToyView({ toy, onFaceChange, pendingMove }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.4], fov: 62 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%', background: 'transparent', touchAction: 'none' }}
    >
      <ambientLight intensity={0.75} color="#fff8f0" />
      <directionalLight position={[4, 6, 5]} intensity={1.1} />
      <hemisphereLight skyColor="#FFF9EC" groundColor="#F8DDB0" intensity={0.38} />

      <DeformableToy toy={toy} onFaceChange={onFaceChange} pendingMove={pendingMove} />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        rotateSpeed={0.8}
      />
    </Canvas>
  )
}
