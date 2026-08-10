const GRADIENTS = [
  'from-red-400 to-orange-400',
  'from-rose-500 to-red-400',
  'from-orange-400 to-amber-300',
  'from-amber-500 to-yellow-400',
  'from-red-600 to-rose-400',
  'from-yellow-400 to-orange-400',
  'from-green-500 to-emerald-400',
  'from-blue-400 to-cyan-400',
  'from-teal-500 to-cyan-400',
  'from-orange-600 to-amber-400',
];

export default function PizzaCard({ pizza, onAuswahl }) {
  const gradient = GRADIENTS[(pizza.id - 1) % GRADIENTS.length];

  return (
    <div
      className="group bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
      onClick={() => onAuswahl(pizza)}
    >
      <div className={`bg-gradient-to-br ${gradient} h-40 flex items-center justify-center relative overflow-hidden`}>
        {pizza.bild_url ? (
          <img src={pizza.bild_url} alt={pizza.name} className="w-full h-full object-contain" />
        ) : (
          <span className="text-7xl select-none drop-shadow-md">🍕</span>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200 flex items-end justify-center pb-3">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white text-red-600 font-bold px-4 py-1.5 rounded-full text-sm shadow-lg">
            Auswählen
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-gray-800 text-base leading-tight">{pizza.name}</h3>
        <p className="text-gray-400 text-xs mt-1 leading-snug line-clamp-2">{pizza.beschreibung}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-red-600 font-bold text-lg">€ {pizza.preis.toFixed(2)}</span>
          <span className="text-xs text-gray-300 bg-gray-100 px-2 py-0.5 rounded-full">Ø 30 cm</span>
        </div>
      </div>
    </div>
  );
}
