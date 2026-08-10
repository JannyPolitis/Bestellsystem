import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

export default function Checkout() {
  const { items, gesamtpreis, leeren } = useCart();
  const navigate = useNavigate();
  const [fehler, setFehler] = useState('');
  const [verarbeitung, setVerarbeitung] = useState(false);

  const handleBestellen = async () => {
    setVerarbeitung(true);
    setFehler('');
    try {
      const res = await fetch('/api/bestellung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artikel: items }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFehler(d.error || 'Fehler beim Aufgeben der Bestellung');
        setVerarbeitung(false);
        return;
      }
      const { bestellnummer } = await res.json();
      leeren();
      navigate(`/bestaetigung/${encodeURIComponent(bestellnummer)}`);
    } catch {
      setFehler('Verbindungsfehler zum Server');
      setVerarbeitung(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: '#FFF8F2' }}>
        <span className="text-6xl">🛒</span>
        <p className="text-xl text-gray-600">Dein Warenkorb ist leer.</p>
        <Link to="/" className="text-red-600 hover:underline font-medium">
          ← Zurück zur Speisekarte
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: '#FFF8F2' }}>
      <div className="max-w-lg mx-auto">

        <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm mb-6 inline-flex items-center gap-1">
          ← Zurück zur Speisekarte
        </Link>

        <h1 className="text-3xl font-bold text-gray-800 mb-6">Bestellung abschließen</h1>

        {/* Bestellübersicht */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-5">
          <h2 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wide">
            Deine Bestellung
          </h2>
          <ul className="space-y-3 divide-y divide-gray-50">
            {items.map(item => (
              <li key={item.id} className="flex justify-between items-start pt-3 first:pt-0">
                <div>
                  <p className="font-semibold text-gray-800">{item.name}</p>
                  <p className="text-sm text-gray-400">
                    {item.menge}× · Ø 30 cm · € {item.preis.toFixed(2)} / Stk.
                  </p>
                </div>
                <span className="font-bold text-gray-700 ml-4">
                  € {(item.preis * item.menge).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-lg font-bold text-gray-800">Gesamt</span>
            <span className="text-2xl font-bold text-red-600">€ {gesamtpreis.toFixed(2)}</span>
          </div>
        </div>

        {/* Zahlung */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">
            Bezahlung
          </h2>

          <div className="mb-5 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm font-medium">
            <span className="text-lg">💶</span>
            <span>Bitte bar bei Abholung bezahlen — passend zahlen hilft uns sehr!</span>
          </div>

          {fehler && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
              {fehler}
            </div>
          )}

          <button
            onClick={handleBestellen}
            disabled={verarbeitung}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-colors text-base flex items-center justify-center gap-2"
          >
            {verarbeitung ? (
              <>
                <span className="animate-spin text-xl">🍕</span>
                <span>Bestellung wird aufgegeben …</span>
              </>
            ) : (
              <span>Bestellung aufgeben</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
