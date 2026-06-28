export default function ToyPicker({ toys, selectedId, onSelect }) {
  return (
    <div style={{
      display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'nowrap',
      padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none',
    }}>
      {toys.map(toy => {
        const active = toy.id === selectedId
        return (
          <button
            key={toy.id}
            onClick={() => onSelect(toy)}
            style={{
              width: active ? 52 : 44,
              height: active ? 52 : 44,
              borderRadius: '50%',
              background: toy.color,
              border: active ? '3px solid #7A4A18' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: active ? 22 : 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              outline: active ? '2px solid white' : 'none',
              outlineOffset: -4,
              transform: active ? 'scale(1)' : 'scale(0.9)',
              transition: 'all 0.18s ease',
              boxShadow: active ? '0 4px 12px rgba(0,0,0,0.18)' : '0 2px 6px rgba(0,0,0,0.1)',
            }}
            title={toy.name}
          >
            {toy.emoji}
          </button>
        )
      })}
    </div>
  )
}
