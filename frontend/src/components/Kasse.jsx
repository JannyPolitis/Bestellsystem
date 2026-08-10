import { useState, useEffect } from 'react';

const SCHNELLBETRAEGE = [5, 10, 20, 50];

export default function Kasse({ onBestellungErstellt }) {
  const [pizzen, setPizzen] = useState([]);
  const [laedt, setLaedt] = useState(true);
  const [warenkorb, setWarenkorb] = useState([]);
  const [gegeben, setGegeben] = useState('');
  const [absenden, setAbsenden] = useState(false);
  const [fehler, setFehler] = useState('');
  const [letzteBestellung, setLetzteBestellung] = useState(null);

  useEffect(() => {
    fetch('/api/pizzas')
      .then(r => r.json())
      .then(setPizzen)
      .finally(() => setLaedt(false));
  }, []);

  const mengeImWarenkorb = (id) => warenkorb.find(i => i.id === id)?.menge || 0;

  const hinzufuegen = (pizza) => {
    setWarenkorb(prev => {
      const exists = prev.find(i => i.id === pizza.id);
      if (exists) return prev.map(i => i.id === pizza.id ? { ...i, menge: i.menge + 1 } : i);
      return [...prev, { id: pizza.id, name: pizza.name, preis: pizza.preis, menge: 1 }];
    });
  };

  const mengeAendern = (id, delta) => {
    setWarenkorb(prev =>
      prev.map(i => i.id === id ? { ...i, menge: i.menge + delta } : i).filter(i => i.menge > 0)
    );
  };

  const gesamtpreis = warenkorb.reduce((s, i) => s + i.preis * i.menge, 0);
  const gegebenZahl = parseFloat(gegeben);
  const wechselgeld = Number.isFinite(gegebenZahl) ? gegebenZahl - gesamtpreis : null;

  const gegebenHinzufuegen = (betrag) => {
    setGegeben(prev => {
      const aktuell = parseFloat(prev) || 0;
      return (aktuell + betrag).toFixed(2);
    });
  };

  const handleAbsenden = async () => {
    setFehler('');
    setAbsenden(true);
    try {
      const res = await fetch('/api/admin/bestellung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ artikel: warenkorb.map(({ id, menge }) => ({ id, menge })) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFehler(d.error || 'Fehler beim Aufnehmen der Bestellung');
        return;
      }
      const data = await res.json();
      setLetzteBestellung({
        bestellnummer: data.bestellnummer,
        gesamtpreis: data.gesamtpreis,
        wechselgeld: Number.isFinite(gegebenZahl) ? gegebenZahl - data.gesamtpreis : null,
      });
      setWarenkorb([]);
      setGegeben('');
      onBestellungErstellt?.();
    } catch {
      setFehler('Verbindungsfehler zum Server');
    } finally {
      setAbsenden(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Pizza-Auswahl */}
        <div className="lg:col-span-3">
          <h2 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">
            Pizzen antippen zum Hinzufügen
          </h2>

          {laedt ? (
            <div className="flex flex-col items-center py-24 gap-3 text-gray-300">
              <span className="text-5xl animate-spin">🍕</span>
              <p>Lädt …</p>
            </div>
          ) : pizzen.length === 0 ? (
            <div className="text-center py-24 text-gray-300">
              <p className="text-5xl mb-3">🍕</p>
              <p>Keine Pizzen auf der Speisekarte</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pizzen.map(p => {
                const menge = mengeImWarenkorb(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => hinzufuegen(p)}
                    className={`relative select-none text-left rounded-2xl shadow-sm border-2 p-4 min-h-[110px] flex flex-col justify-between transition-all active:scale-95 ${
                      menge > 0 ? 'border-red-500 bg-red-50' : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    {menge > 0 && (
                      <span className="absolute -top-2.5 -right-2.5 bg-red-600 text-white text-base font-bold w-9 h-9 rounded-full flex items-center justify-center shadow-md">
                        {menge}
                      </span>
                    )}
                    <p className="font-bold text-gray-800 text-base leading-snug">{p.name}</p>
                    <p className="text-red-600 font-bold text-lg mt-2">€ {p.preis.toFixed(2)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bestellübersicht + Kasse */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-md p-5 lg:sticky lg:top-24">
            {letzteBestellung ? (
              <div className="text-center py-2">
                <p className="text-5xl mb-2">✅</p>
                <p className="text-sm text-gray-400 mb-1">Bestellnummer</p>
                <p className="text-4xl font-bold text-red-600 font-mono mb-4">#{letzteBestellung.bestellnummer}</p>

                <div className="bg-red-50 rounded-xl p-4 mb-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Gesamt</p>
                  <p className="text-xl font-bold text-gray-800">€ {letzteBestellung.gesamtpreis.toFixed(2)}</p>
                </div>

                {letzteBestellung.wechselgeld !== null && letzteBestellung.wechselgeld >= 0 && (
                  <div className="bg-green-50 rounded-xl p-4 mb-4">
                    <p className="text-xs text-green-600 uppercase tracking-wide mb-1">Wechselgeld</p>
                    <p className="text-3xl font-bold text-green-700">€ {letzteBestellung.wechselgeld.toFixed(2)}</p>
                  </div>
                )}

                <button
                  onClick={() => setLetzteBestellung(null)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg py-5 rounded-2xl transition-colors mt-2 active:scale-95"
                >
                  Nächste Bestellung
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">Bestellung</h2>

                {warenkorb.length === 0 ? (
                  <div className="text-center py-10 text-gray-300">
                    <p className="text-4xl mb-2">🧾</p>
                    <p className="text-sm">Noch keine Artikel ausgewählt</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50 mb-4">
                    {warenkorb.map(item => (
                      <li key={item.id} className="py-3 first:pt-0">
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <p className="font-semibold text-gray-800">{item.name}</p>
                          <span className="font-bold text-gray-700 shrink-0">
                            € {(item.preis * item.menge).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => mengeAendern(item.id, -1)}
                            className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 text-2xl font-bold flex items-center justify-center transition-colors select-none"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-bold text-gray-800 text-lg">{item.menge}</span>
                          <button
                            onClick={() => mengeAendern(item.id, 1)}
                            className="w-12 h-12 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-2xl font-bold flex items-center justify-center transition-colors select-none"
                          >
                            +
                          </button>
                          <span className="text-xs text-gray-400 ml-1">à € {item.preis.toFixed(2)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="pt-3 border-t border-gray-100 flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-800">Gesamt</span>
                  <span className="text-xl font-bold text-red-600">€ {gesamtpreis.toFixed(2)}</span>
                </div>

                {fehler && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
                    {fehler}
                  </div>
                )}

                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Gegeben (€)
                    </label>
                    {gegeben !== '' && (
                      <button
                        onClick={() => setGegeben('')}
                        className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                      >
                        Leeren
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={gegeben}
                    onChange={e => setGegeben(e.target.value)}
                    placeholder="0,00"
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-500"
                  />

                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {SCHNELLBETRAEGE.map(betrag => (
                      <button
                        key={betrag}
                        onClick={() => gegebenHinzufuegen(betrag)}
                        className="py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 text-lg font-bold transition-colors select-none"
                      >
                        +{betrag}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setGegeben(gesamtpreis > 0 ? gesamtpreis.toFixed(2) : '')}
                    disabled={gesamtpreis === 0}
                    className="w-full mt-2 py-3.5 rounded-2xl bg-green-100 hover:bg-green-200 active:bg-green-300 text-green-700 text-base font-bold transition-colors disabled:opacity-40 select-none"
                  >
                    Passend gezahlt
                  </button>

                  {wechselgeld !== null && (
                    wechselgeld >= 0 ? (
                      <div className="mt-3 bg-green-50 rounded-2xl px-4 py-4 flex justify-between items-center">
                        <span className="text-base font-semibold text-green-700">Wechselgeld</span>
                        <span className="text-3xl font-bold text-green-700">€ {wechselgeld.toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="mt-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-sm font-medium text-amber-700">
                        Betrag reicht nicht — es fehlen € {Math.abs(wechselgeld).toFixed(2)}
                      </div>
                    )
                  )}
                </div>

                <button
                  onClick={handleAbsenden}
                  disabled={warenkorb.length === 0 || absenden}
                  className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold text-lg py-5 rounded-2xl transition-colors mt-4 flex items-center justify-center gap-2 select-none"
                >
                  {absenden ? (
                    <>
                      <span className="animate-spin">🍕</span>
                      <span>Wird aufgenommen …</span>
                    </>
                  ) : (
                    <span>Bestellung aufnehmen</span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
