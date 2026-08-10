import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar.jsx';
import CartDrawer from '../components/CartDrawer.jsx';
import PizzaCard from '../components/PizzaCard.jsx';
import QuantityModal from '../components/QuantityModal.jsx';
import Geschlossen from '../components/Geschlossen.jsx';

export default function Home() {
  const [status, setStatus] = useState(null);
  const [pizzas, setPizzas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fehler, setFehler] = useState('');
  const [selectedPizza, setSelectedPizza] = useState(null);

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ offen: true, event: null }));
  }, []);

  useEffect(() => {
    if (!status?.offen) return;
    fetch('/api/pizzas')
      .then(r => {
        if (!r.ok) throw new Error('Fehler beim Laden');
        return r.json();
      })
      .then(data => {
        setPizzas(data);
        setLoading(false);
      })
      .catch(() => {
        setFehler('Pizzen konnten nicht geladen werden. Ist der Server gestartet?');
        setLoading(false);
      });
  }, [status]);

  if (status === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#FFF8F2' }}>
        <span className="text-5xl animate-spin">🍕</span>
      </div>
    );
  }

  if (!status.offen) {
    return <Geschlossen event={status.event} />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF8F2' }}>
      <Navbar />
      <CartDrawer />

      <main className="pt-20 pb-16 max-w-7xl mx-auto px-4">
        <div className="text-center py-10 sm:py-14">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-3">
            Unsere Pizzen
          </h1>
          <p className="text-gray-400 text-lg">
            Alle Pizzen handgemacht · Ø 30 cm · Frisch aus dem Ofen
          </p>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
            <span className="text-5xl animate-spin">🍕</span>
            <p>Speisekarte wird geladen …</p>
          </div>
        )}

        {fehler && (
          <div className="max-w-md mx-auto text-center py-20">
            <p className="text-5xl mb-4">😔</p>
            <p className="text-gray-500">{fehler}</p>
          </div>
        )}

        {!loading && !fehler && pizzas.length === 0 && (
          <p className="text-center text-gray-400 py-20">Keine Pizzen verfügbar.</p>
        )}

        {!loading && !fehler && pizzas.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {pizzas.map(pizza => (
              <PizzaCard
                key={pizza.id}
                pizza={pizza}
                onAuswahl={setSelectedPizza}
              />
            ))}
          </div>
        )}
      </main>

      {selectedPizza && (
        <QuantityModal
          pizza={selectedPizza}
          onClose={() => setSelectedPizza(null)}
        />
      )}
    </div>
  );
}
