import SquishyToy from './SquishyToy'

export default function ToyShelf({ toys }) {
  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Toys sitting on shelf */}
      <div className="flex items-end justify-center gap-6 px-6 pb-4 flex-wrap">
        {toys.map((toy) => (
          <SquishyToy key={toy.id} toy={toy} size={130} />
        ))}
      </div>

      {/* Shelf plank */}
      <div
        className="w-full max-w-3xl rounded-2xl"
        style={{
          height: 22,
          background: 'linear-gradient(180deg, #C68B4A 0%, #A0652A 60%, #7A4A18 100%)',
          boxShadow: '0 8px 24px rgba(100,60,10,0.35), 0 2px 4px rgba(100,60,10,0.2)',
        }}
      />
      {/* Shelf shadow on wall */}
      <div
        className="w-full max-w-2xl rounded-full"
        style={{
          height: 10,
          background: 'rgba(120,70,10,0.12)',
          filter: 'blur(6px)',
          marginTop: 2,
        }}
      />
    </div>
  )
}
