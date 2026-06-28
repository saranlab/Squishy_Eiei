import { motion, AnimatePresence } from 'framer-motion'
import { FACE } from '../hooks/useSquishy'

// Each face is SVG elements rendered inside the squishy body's coordinate space.
// The squishy body is drawn in a ~100x100 viewBox, face is centered around (50,50).

function NormalFace() {
  return (
    <g>
      {/* Eyes */}
      <circle cx="37" cy="42" r="5.5" fill="#333" />
      <circle cx="63" cy="42" r="5.5" fill="#333" />
      {/* Eye shine */}
      <circle cx="39.5" cy="39.5" r="2" fill="white" />
      <circle cx="65.5" cy="39.5" r="2" fill="white" />
      {/* Smile */}
      <path d="M 38 54 Q 50 62 62 54" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Blush */}
      <ellipse cx="28" cy="52" rx="6" ry="3.5" fill="rgba(255,120,120,0.25)" />
      <ellipse cx="72" cy="52" rx="6" ry="3.5" fill="rgba(255,120,120,0.25)" />
    </g>
  )
}

function SquishingFace() {
  return (
    <g>
      {/* Squished X eyes */}
      <line x1="33" y1="38" x2="41" y2="46" stroke="#333" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="41" y1="38" x2="33" y2="46" stroke="#333" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="59" y1="38" x2="67" y2="46" stroke="#333" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="67" y1="38" x2="59" y2="46" stroke="#333" strokeWidth="2.5" strokeLinecap="round" />
      {/* Open mouth "aah" */}
      <ellipse cx="50" cy="56" rx="9" ry="6" fill="#333" />
      <ellipse cx="50" cy="54" rx="7" ry="3.5" fill="#a85050" />
    </g>
  )
}

function RisingFace() {
  return (
    <g>
      {/* Relieved closed-curve eyes */}
      <path d="M 32 44 Q 37 38 42 44" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 58 44 Q 63 38 68 44" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Small relieved smile */}
      <path d="M 40 55 Q 50 61 60 55" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Sweat drop */}
      <ellipse cx="76" cy="36" rx="3" ry="4.5" fill="#90CEFF" opacity="0.7" />
      <path d="M 73 34 Q 76 28 79 34" fill="#90CEFF" opacity="0.7" />
    </g>
  )
}

const faceVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
}

export default function FaceExpression({ state }) {
  return (
    <AnimatePresence mode="wait">
      <motion.g
        key={state}
        variants={faceVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.12 }}
      >
        {state === FACE.NORMAL && <NormalFace />}
        {state === FACE.SQUISHING && <SquishingFace />}
        {state === FACE.RISING && <RisingFace />}
      </motion.g>
    </AnimatePresence>
  )
}
