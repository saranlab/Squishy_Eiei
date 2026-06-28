export const SPEED_PRESETS = {
  slow:   { tension: 18, friction: 12, mass: 8 },
  normal: { tension: 50, friction: 16, mass: 3 },
  bouncy: { tension: 120, friction: 22, mass: 1 },
}

export const TOYS = [
  {
    id: 'bread',
    name: 'Bread Loaf',
    emoji: '🍞',
    color: '#E8C99A',       // lighter warm tan — matches real bread squishies
    colorDark: '#C49A60',
    colorLight: '#F5E4C8',
    geometry: 'bread',
    speed: 'slow',
    riseSpeed: SPEED_PRESETS.slow,
  },
  {
    id: 'hamster',
    name: 'Hamster Mochi',
    emoji: '🐹',
    color: '#FAFAF8',       // near-white cream body like reference image
    colorDark: '#E8E0D8',
    earColor: '#E8C4A8',    // warm beige ears
    blushColor: '#F2A0A8',  // strong pink blush like reference
    geometry: 'sphere',
    speed: 'slow',
    riseSpeed: SPEED_PRESETS.slow,
  },
  {
    id: 'avocado',
    name: 'Avocado',
    emoji: '🥑',
    color: '#7DC466',       // slightly lighter/more pastel green
    colorDark: '#4A8A38',
    colorLight: '#B8E4A8',
    pitColor: '#7A4E28',
    geometry: 'avocado',
    speed: 'normal',
    riseSpeed: SPEED_PRESETS.normal,
  },
  {
    id: 'unicorn',
    name: 'Unicorn',
    emoji: '🦄',
    color: '#F8D0E4',       // very pale pastel pink — softer
    colorDark: '#E090B8',
    colorLight: '#FFF0F8',
    hornColor: '#FFD700',
    geometry: 'unicorn',
    speed: 'bouncy',
    riseSpeed: SPEED_PRESETS.bouncy,
  },
  {
    id: 'donut',
    name: 'Donut',
    emoji: '🍩',
    color: '#EDA882',       // warm golden-tan donut
    colorDark: '#C07040',
    colorLight: '#F8D8C0',
    frostingColor: '#F7A8C4',
    geometry: 'torus',
    speed: 'normal',
    riseSpeed: SPEED_PRESETS.normal,
  },
  {
    id: 'cat',
    name: 'Cat',
    emoji: '🐱',
    color: '#F5DFA0',       // warm cream-yellow like a real plush cat
    colorDark: '#D0A848',
    colorLight: '#FDF4D8',
    geometry: 'cat',
    speed: 'normal',
    riseSpeed: SPEED_PRESETS.normal,
  },
  {
    id: 'butter',
    name: 'Butter',
    emoji: '🧈',
    color: '#F8E050',       // bright clean butter yellow
    colorDark: '#C89820',
    colorLight: '#FFF8C0',
    foilColor: '#D4A412',   // medium gold foil wrap
    geometry: 'butter',
    speed: 'slow',
    riseSpeed: SPEED_PRESETS.slow,
  },
  {
    id: 'chocolate',
    name: 'Chocolate',
    emoji: '🍫',
    color: '#7B4528',
    colorDark: '#4A2210',
    colorLight: '#B07050',
    geometry: 'chocolate',
    speed: 'slow',
    riseSpeed: { tension: 22, friction: 13, mass: 7 },
  },
]

export const CREATOR_COLORS = [
  '#FF6B6B', '#FF9F43', '#FECA57', '#48DBFB',
  '#54A0FF', '#5F27CD', '#C44569', '#A29BFE',
  '#55EFC4', '#FD79A8', '#FDCB6E', '#E17055',
]

export const CREATOR_SHAPES = [
  { id: 'sphere',    label: 'Blob',      emoji: '🫧' },
  { id: 'box',       label: 'Chonk',     emoji: '🧊' },
  { id: 'torus',     label: 'Donut',     emoji: '🍩' },
  { id: 'butter',    label: 'Butter',    emoji: '🧈' },
  { id: 'chocolate', label: 'Choco',     emoji: '🍫' },
  { id: 'star',      label: 'Star',      emoji: '⭐' },
  { id: 'cat',       label: 'Cat',       emoji: '🐱' },
  { id: 'unicorn',   label: 'Unicorn',   emoji: '🦄' },
]
