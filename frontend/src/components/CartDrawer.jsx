import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

export default function CartDrawer() {
  const { items, updateMenge, gesamtpreis, isOpen, setIsOpen } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleKasse = () => {
    setIsOpen(false);
    navigate('/kasse');
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Warenkorb</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-300 hover:text-gray-500 text-3xl leading-none font-light"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
              <span className="text-6xl">🛒</span>
              <p className="text-sm">Dein Warenkorb ist leer</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map(item => (
                <li key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">€ {item.preis.toFixed(2)} / Stk.</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateMenge(item.id, item.menge - 1)}
                      className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-red-100 hover:text-red-600 transition-colors flex items-center justify-center text-sm"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-bold text-gray-800 text-sm">{item.menge}</span>
                    <button
                      onClick={() => updateMenge(item.id, item.menge + 1)}
                      className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-red-100 hover:text-red-600 transition-colors flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right w-14">
                    <p className="font-bold text-red-600 text-sm">€ {(item.preis * item.menge).toFixed(2)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-gray-700">Gesamt</span>
              <span className="text-2xl font-bold text-red-600">€ {gesamtpreis.toFixed(2)}</span>
            </div>
            <button
              onClick={handleKasse}
              className="w-full bg-red-600 text-white font-bold py-3.5 rounded-xl hover:bg-red-700 transition-colors text-base"
            >
              Zur Bestellung →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
