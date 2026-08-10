import { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';

export default function QuantityModal({ pizza, onClose }) {
  const [menge, setMenge] = useState(1);
  const { addItem } = useCart();

  const handleAdd = () => {
    addItem(pizza, menge);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-[fadeIn_0.15s_ease]"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 text-3xl leading-none font-light"
        >
          ×
        </button>

        <div className="text-5xl mb-4 text-center">🍕</div>
        <h2 className="text-2xl font-bold text-gray-800 text-center pr-4">{pizza.name}</h2>
        <p className="text-gray-400 text-sm mt-2 text-center leading-relaxed">{pizza.beschreibung}</p>
        <p className="text-gray-300 text-xs mt-1 text-center">Größe: Ø 30 cm</p>

        <div className="mt-5 text-center">
          <span className="text-3xl font-bold text-red-600">
            € {(pizza.preis * menge).toFixed(2)}
          </span>
          {menge > 1 && (
            <span className="text-gray-400 text-sm ml-2">({menge} × € {pizza.preis.toFixed(2)})</span>
          )}
        </div>

        <div className="flex items-center justify-center gap-5 mt-6">
          <button
            onClick={() => setMenge(m => Math.max(1, m - 1))}
            className="w-12 h-12 rounded-full bg-red-50 text-red-600 font-bold text-2xl hover:bg-red-100 transition-colors flex items-center justify-center"
          >
            −
          </button>
          <span className="text-3xl font-bold text-gray-800 w-10 text-center">{menge}</span>
          <button
            onClick={() => setMenge(m => m + 1)}
            className="w-12 h-12 rounded-full bg-red-50 text-red-600 font-bold text-2xl hover:bg-red-100 transition-colors flex items-center justify-center"
          >
            +
          </button>
        </div>

        <button
          onClick={handleAdd}
          className="mt-6 w-full bg-red-600 text-white font-bold py-3.5 rounded-xl hover:bg-red-700 transition-colors text-base"
        >
          Zum Warenkorb hinzufügen
        </button>
      </div>
    </div>
  );
}
