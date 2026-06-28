import { motion } from 'framer-motion'
import { useSquishy } from '../hooks/useSquishy'
import FaceExpression from './FaceExpression'

const SQUISH_SPRING = { type: 'spring', stiffness: 900, damping: 35 }

function riseSpring(toy) {
  return { type: 'spring', ...toy.riseSpeed }
}

// ── Shape bodies ────────────────────────────────────────────────────────────

function LoafBody({ toy }) {
  return (
    <>
      <ellipse cx="50" cy="72" rx="42" ry="10" fill={toy.colorDark} />
      <rect x="12" y="30" width="76" height="44" rx="12" fill={toy.color} />
      <ellipse cx="50" cy="30" rx="38" ry="18" fill={toy.colorLight} />
      {/* Sesame seeds */}
      <ellipse cx="38" cy="22" rx="3" ry="1.5" fill={toy.colorDark} transform="rotate(-20,38,22)" />
      <ellipse cx="52" cy="18" rx="3" ry="1.5" fill={toy.colorDark} transform="rotate(10,52,18)" />
      <ellipse cx="64" cy="23" rx="3" ry="1.5" fill={toy.colorDark} transform="rotate(-15,64,23)" />
    </>
  )
}

function AvocadoBody({ toy }) {
  return (
    <>
      <ellipse cx="50" cy="55" rx="34" ry="38" fill={toy.colorDark} />
      <ellipse cx="50" cy="56" rx="29" ry="33" fill={toy.color} />
      <ellipse cx="50" cy="58" rx="22" ry="26" fill="#F5E6A3" />
      <ellipse cx="50" cy="62" rx="12" ry="14" fill={toy.pitColor} />
      <ellipse cx="45" cy="57" rx="3" ry="4" fill="rgba(255,255,255,0.25)" />
    </>
  )
}

function UnicornBody({ toy }) {
  return (
    <>
      {/* Ears */}
      <polygon points="26,28 20,8 36,22" fill={toy.colorDark} />
      <polygon points="74,28 80,8 64,22" fill={toy.colorDark} />
      {/* Horn */}
      <polygon points="50,4 44,26 56,26" fill={toy.hornColor} />
      <line x1="50" y1="6" x2="50" y2="25" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      {/* Body */}
      <ellipse cx="50" cy="60" rx="38" ry="32" fill={toy.color} />
      <ellipse cx="50" cy="60" rx="30" ry="24" fill={toy.colorLight} />
      {/* Mane streak */}
      <path d="M 25 38 Q 30 50 26 64" stroke="#C9F" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M 20 42 Q 22 54 19 66" stroke="#9CF" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  )
}

function DonutBody({ toy, squished }) {
  // Hole shrinks when squished
  const holeRy = squished ? 3 : 14
  return (
    <>
      <ellipse cx="50" cy="55" rx="40" ry="30" fill={toy.color} />
      <ellipse cx="50" cy="55" rx="40" ry="30" fill={toy.color} />
      {/* Frosting drips */}
      <ellipse cx="50" cy="43" rx="32" ry="16" fill={toy.frostingColor} />
      <path d="M 24 43 Q 20 52 23 56" stroke={toy.frostingColor} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M 36 38 Q 32 50 33 58" stroke={toy.frostingColor} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M 64 38 Q 68 50 67 58" stroke={toy.frostingColor} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M 76 43 Q 80 52 77 56" stroke={toy.frostingColor} strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* Sprinkles */}
      <rect x="40" y="36" width="7" height="2.5" rx="1.25" fill="#F66" transform="rotate(30,43,37)" />
      <rect x="54" y="34" width="7" height="2.5" rx="1.25" fill="#6CF" transform="rotate(-20,57,35)" />
      <rect x="46" y="30" width="7" height="2.5" rx="1.25" fill="#FD6" transform="rotate(10,49,31)" />
      {/* Hole */}
      <motion.ellipse
        cx="50" cy="55"
        rx="14"
        animate={{ ry: holeRy }}
        transition={squished ? SQUISH_SPRING : { type: 'spring', stiffness: 50, damping: 12, mass: 3 }}
        fill="#FFF9EC"
      />
    </>
  )
}

function CatBody({ toy, squished }) {
  // Ear droop when squished
  const earTilt = squished ? 15 : 0
  return (
    <>
      {/* Ears */}
      <motion.polygon
        points="22,38 14,12 38,28"
        fill={toy.colorDark}
        animate={{ rotate: earTilt }}
        style={{ transformOrigin: '28px 32px' }}
        transition={squished ? SQUISH_SPRING : riseSpring(toy)}
      />
      <motion.polygon
        points="78,38 86,12 62,28"
        fill={toy.colorDark}
        animate={{ rotate: -earTilt }}
        style={{ transformOrigin: '72px 32px' }}
        transition={squished ? SQUISH_SPRING : riseSpring(toy)}
      />
      <polygon points="26,36 19,18 36,28" fill={toy.color} />
      <polygon points="74,36 81,18 64,28" fill={toy.color} />
      {/* Body */}
      <ellipse cx="50" cy="62" rx="38" ry="30" fill={toy.color} />
      <ellipse cx="50" cy="62" rx="28" ry="22" fill={toy.colorLight} />
      {/* Whiskers */}
      <line x1="14" y1="58" x2="36" y2="62" stroke={toy.colorDark} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="64" x2="36" y2="64" stroke={toy.colorDark} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="64" y1="62" x2="86" y2="58" stroke={toy.colorDark} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="64" y1="64" x2="86" y2="64" stroke={toy.colorDark} strokeWidth="1.5" strokeLinecap="round" />
      {/* Nose */}
      <polygon points="50,66 46,70 54,70" fill="#F9A" />
    </>
  )
}

function ToyBody({ toy, squished }) {
  switch (toy.shape) {
    case 'loaf':    return <LoafBody toy={toy} squished={squished} />
    case 'avocado': return <AvocadoBody toy={toy} squished={squished} />
    case 'unicorn': return <UnicornBody toy={toy} squished={squished} />
    case 'donut':   return <DonutBody toy={toy} squished={squished} />
    case 'cat':     return <CatBody toy={toy} squished={squished} />
    default:        return <LoafBody toy={toy} squished={squished} />
  }
}

// ── Face placement per shape ────────────────────────────────────────────────

function faceTransform(shape) {
  switch (shape) {
    case 'avocado': return 'translate(0, 5)'
    case 'unicorn': return 'translate(0, 10)'
    case 'donut':   return 'translate(0, 6)'
    case 'cat':     return 'translate(0, 10)'
    default:        return 'translate(0, 8)'
  }
}

// ── Main component ──────────────────────────────────────────────────────────

export default function SquishyToy({ toy, size = 140 }) {
  const { squished, mega, face, onPointerDown, onPointerUp } = useSquishy(toy)

  const scaleX = mega ? 1.6 : squished ? 1.35 : 1
  const scaleY = mega ? 0.28 : squished ? 0.45 : 1

  const bodySpring = squished ? SQUISH_SPRING : riseSpring(toy)

  return (
    <div
      className="flex flex-col items-center gap-2 select-none"
      style={{ touchAction: 'none' }}
    >
      <motion.svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="cursor-pointer drop-shadow-lg"
        style={{ touchAction: 'none', transformOrigin: '50% 100%' }}
        animate={{ scaleX, scaleY }}
        transition={bodySpring}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <ToyBody toy={toy} squished={squished} />
        <g transform={faceTransform(toy.shape)}>
          <FaceExpression state={face} />
        </g>
      </motion.svg>

      <motion.p
        className="text-sm font-bold tracking-wide"
        style={{ color: toy.colorDark, fontFamily: "'Fredoka One', cursive" }}
        animate={{ y: squished ? 8 : 0 }}
        transition={bodySpring}
      >
        {toy.name}
      </motion.p>
    </div>
  )
}
