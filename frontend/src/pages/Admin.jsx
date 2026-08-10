import { useState, useEffect, useCallback } from 'react';
import PizzaFormModal from '../components/PizzaFormModal.jsx';
import logo from '../Logo/PizzaSquad.png';

const STATUS = {
  neu:       { label: 'Neu',       badge: 'bg-blue-100 text-blue-700',   next: 'in_arbeit', nextLabel: '→ In Bearbeitung', nextColor: 'bg-amber-500 hover:bg-amber-600' },
  in_arbeit: { label: 'In Arbeit', badge: 'bg-amber-100 text-amber-700', next: 'fertig',    nextLabel: '✓ Fertig',         nextColor: 'bg-green-500 hover:bg-green-600' },
  fertig:    { label: 'Fertig',    badge: 'bg-green-100 text-green-700', next: null,        nextLabel: null,               nextColor: '' },
};

const TABS = [
  { key: 'alle',      label: 'Alle' },
  { key: 'neu',       label: 'Neu' },
  { key: 'in_arbeit', label: 'In Arbeit' },
  { key: 'fertig',    label: 'Fertig' },
];

function formatZeit(dt) {
  return new Date(dt).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// --- Tagesbilanz Modal ---
function BilanzModal({ onAbbrechen, onBestaetigen }) {
  const [bilanz, setBilanz] = useState(null);
  const [laedt, setLaedt] = useState(true);
  const [bestaetigung, setBestaetigung] = useState(false);
  const [abschliessen, setAbschliessen] = useState(false);

  useEffect(() => {
    fetch('/api/admin/bilanz', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setBilanz(d); setLaedt(false); })
      .catch(() => setLaedt(false));
  }, []);

  const handleBestaetigen = async () => {
    setAbschliessen(true);
    const res = await fetch('/api/admin/tagesabschluss', {
      method: 'POST', credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      onBestaetigen(data);
    }
  };

  const heute = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const maxMenge = bilanz?.pizzaListe?.[0]?.menge || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onAbbrechen}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Tagesabschluss</h2>
              <p className="text-sm text-gray-400 mt-0.5">{heute}</p>
            </div>
            <button onClick={onAbbrechen} className="text-gray-300 hover:text-gray-500 text-3xl leading-none font-light">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {laedt ? (
            <div className="flex items-center justify-center py-12 text-gray-300 gap-3">
              <span className="animate-spin text-3xl">🍕</span>
              <span>Bilanz wird berechnet …</span>
            </div>
          ) : !bilanz || bilanz.anzahlBestellungen === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p>Keine Bestellungen heute.</p>
            </div>
          ) : (
            <>
              {/* Kennzahlen */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Bestellungen', wert: bilanz.anzahlBestellungen, suffix: '' },
                  { label: 'Pizzen gesamt', wert: bilanz.gesamtPizzen, suffix: '' },
                  { label: 'Umsatz', wert: `€ ${bilanz.gesamtUmsatz.toFixed(2)}`, suffix: '' },
                ].map(k => (
                  <div key={k.label} className="bg-red-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{k.wert}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Pizza-Aufschlüsselung */}
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                Pizzen nach Sorte
              </h3>
              <ul className="space-y-2.5">
                {bilanz.pizzaListe.map((p, i) => (
                  <li key={p.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {i === 0 && <span className="text-amber-400 mr-1">★</span>}
                        {p.name}
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-800">{p.menge}×</span>
                        <span className="text-xs text-gray-400 ml-2">€ {p.umsatz.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full transition-all"
                        style={{ width: `${(p.menge / maxMenge) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          {!bestaetigung ? (
            <>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>Alle Bestellungen werden unwiderruflich gelöscht und die Bestellnummern für den nächsten Tag zurückgesetzt (ab 100).</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onAbbrechen}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-100 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => setBestaetigung(true)}
                  disabled={laedt}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Tag beenden
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-red-700 text-center mb-4">
                Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setBestaetigung(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-100 transition-colors"
                >
                  Zurück
                </button>
                <button
                  onClick={handleBestaetigen}
                  disabled={abschliessen}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {abschliessen ? <><span className="animate-spin">🍕</span> Wird abgeschlossen…</> : '✓ Jetzt abschließen'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Hauptkomponente ---
export default function Admin() {
  const [eingeloggt, setEingeloggt] = useState(false);
  const [passwort, setPasswort] = useState('');
  const [loginFehler, setLoginFehler] = useState('');
  const [bestellungen, setBestellungen] = useState([]);
  const [laedt, setLaedt] = useState(false);
  const [tab, setTab] = useState('alle');
  const [bilanzOffen, setBilanzOffen] = useState(false);
  const [erfolg, setErfolg] = useState('');
  const [ansicht, setAnsicht] = useState('bestellungen');
  const [pizzen, setPizzen] = useState([]);
  const [pizzenLaedt, setPizzenLaedt] = useState(false);
  const [pizzaFormOffen, setPizzaFormOffen] = useState(false);
  const [bearbeitetePizza, setBearbeitetePizza] = useState(null);

  const ladePizzen = useCallback(async () => {
    setPizzenLaedt(true);
    try {
      const res = await fetch('/api/admin/pizzas', { credentials: 'include' });
      if (res.ok) setPizzen(await res.json());
    } finally {
      setPizzenLaedt(false);
    }
  }, []);

  useEffect(() => {
    if (eingeloggt && ansicht === 'speisekarte' && pizzen.length === 0) ladePizzen();
  }, [eingeloggt, ansicht, pizzen.length, ladePizzen]);

  const handlePizzaGespeichert = (pizza) => {
    setPizzen(prev => {
      const existiert = prev.some(p => p.id === pizza.id);
      return existiert ? prev.map(p => p.id === pizza.id ? pizza : p) : [...prev, pizza];
    });
    setPizzaFormOffen(false);
    setBearbeitetePizza(null);
  };

  const handlePizzaLoeschen = async (pizza) => {
    if (!window.confirm(`"${pizza.name}" wirklich von der Speisekarte loeschen?`)) return;
    const res = await fetch(`/api/admin/pizzas/${pizza.id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) setPizzen(prev => prev.filter(p => p.id !== pizza.id));
  };

  const handleVerfuegbarkeitUmschalten = async (pizza) => {
    const formData = new FormData();
    formData.append('name', pizza.name);
    formData.append('beschreibung', pizza.beschreibung || '');
    formData.append('preis', String(pizza.preis));
    formData.append('verfuegbar', String(!pizza.verfuegbar));
    const res = await fetch(`/api/admin/pizzas/${pizza.id}`, { method: 'PUT', credentials: 'include', body: formData });
    if (res.ok) {
      const aktualisiert = await res.json();
      setPizzen(prev => prev.map(p => p.id === pizza.id ? aktualisiert : p));
    }
  };

  useEffect(() => {
    fetch('/api/admin/check', { credentials: 'include' })
      .then(r => { if (r.ok) setEingeloggt(true); })
      .catch(() => {});
  }, []);

  const ladeBestellungen = useCallback(async () => {
    setLaedt(true);
    try {
      const res = await fetch('/api/admin/bestellungen', { credentials: 'include' });
      if (res.ok) setBestellungen(await res.json());
    } finally {
      setLaedt(false);
    }
  }, []);

  useEffect(() => {
    if (!eingeloggt) return;
    ladeBestellungen();
    const timer = setInterval(ladeBestellungen, 30000);
    return () => clearInterval(timer);
  }, [eingeloggt, ladeBestellungen]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ passwort }),
    });
    if (res.ok) { setEingeloggt(true); setLoginFehler(''); }
    else setLoginFehler('Falsches Passwort');
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    setEingeloggt(false);
    setBestellungen([]);
  };

  const statusAendern = async (id, neuerStatus) => {
    const res = await fetch(`/api/admin/bestellungen/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: neuerStatus }),
    });
    if (res.ok) setBestellungen(prev => prev.map(b => b.id === id ? { ...b, status: neuerStatus } : b));
  };

  const handleTagesabschluss = (bilanz) => {
    setBilanzOffen(false);
    setBestellungen([]);
    setErfolg(`Tag abgeschlossen · ${bilanz.anzahlBestellungen} Bestellungen · ${bilanz.gesamtPizzen} Pizzen · € ${bilanz.gesamtUmsatz.toFixed(2)}`);
    setTimeout(() => setErfolg(''), 8000);
  };

  const gefiltert = tab === 'alle' ? bestellungen : bestellungen.filter(b => b.status === tab);

  // --- Login ---
  if (!eingeloggt) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#FFF8F2' }}>
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full">
          <div className="text-center mb-6">
            <img src={logo} alt="Pizza Squad" className="w-28 h-28 rounded-full object-cover mx-auto" />
            <h1 className="text-2xl font-bold text-gray-800 mt-2">Admin-Bereich</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Passwort</label>
              <input
                type="password"
                value={passwort}
                onChange={e => setPasswort(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Admin-Passwort"
                autoFocus
              />
            </div>
            {loginFehler && <p className="text-red-500 text-sm">{loginFehler}</p>}
            <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors">
              Einloggen
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Dashboard ---
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF8F2' }}>
      {bilanzOffen && (
        <BilanzModal
          onAbbrechen={() => setBilanzOffen(false)}
          onBestaetigen={handleTagesabschluss}
        />
      )}

      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between py-3.5">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Pizza Squad" className="w-12 h-12 rounded-full object-cover" />
              <h1 className="text-lg font-bold text-gray-800">Pizza Squad Admin</h1>
              {(laedt || pizzenLaedt) && <span className="animate-spin text-sm ml-1">🔄</span>}
            </div>
            <div className="flex items-center gap-2">
              {ansicht === 'bestellungen' && (
                <button
                  onClick={ladeBestellungen}
                  className="text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                >
                  Aktualisieren
                </button>
              )}
              <button
                onClick={() => setBilanzOffen(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm font-semibold flex items-center gap-1"
              >
                <span>🏁</span>
                <span className="hidden sm:inline">Geschäft beenden</span>
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                Abmelden
              </button>
            </div>
          </div>

          {/* Ansicht-Umschalter */}
          <div className="flex gap-1 -mb-px">
            {[
              { key: 'bestellungen', label: 'Bestellungen' },
              { key: 'speisekarte', label: 'Speisekarte' },
            ].map(a => (
              <button
                key={a.key}
                onClick={() => setAnsicht(a.key)}
                className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                  ansicht === a.key ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Bestellstatus-Tabs (nur in der Bestellungen-Ansicht) */}
          {ansicht === 'bestellungen' && (
            <div className="flex gap-1 -mb-px pt-1">
              {TABS.map(t => {
                const cnt = t.key === 'alle' ? bestellungen.length : bestellungen.filter(b => b.status === t.key).length;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                      tab === t.key ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {t.label}
                    {cnt > 0 && (
                      <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                        tab === t.key ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {cnt}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Erfolgs-Banner */}
      {erfolg && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2">
            <span>✅</span> {erfolg}
          </div>
        </div>
      )}

      {ansicht === 'speisekarte' && (
        <>
          {pizzaFormOffen && (
            <PizzaFormModal
              pizza={bearbeitetePizza}
              onClose={() => { setPizzaFormOffen(false); setBearbeitetePizza(null); }}
              onSaved={handlePizzaGespeichert}
            />
          )}

          <div className="max-w-4xl mx-auto px-4 py-5">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { setBearbeitetePizza(null); setPizzaFormOffen(true); }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5"
              >
                <span>+</span> Neue Pizza
              </button>
            </div>

            {pizzenLaedt && pizzen.length === 0 ? (
              <div className="flex flex-col items-center py-24 gap-3 text-gray-300">
                <span className="text-5xl animate-spin">🍕</span>
                <p>Lädt …</p>
              </div>
            ) : pizzen.length === 0 ? (
              <div className="text-center py-24 text-gray-300">
                <p className="text-5xl mb-3">🍕</p>
                <p>Noch keine Pizzen angelegt</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pizzen.map(p => (
                  <div key={p.id} className={`bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden ${!p.verfuegbar ? 'opacity-60' : ''}`}>
                    <div className="h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
                      {p.bild_url ? (
                        <img src={p.bild_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">🍕</span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-800">{p.name}</h3>
                        <span className="font-bold text-red-600 shrink-0">€ {p.preis.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-3 line-clamp-2">{p.beschreibung}</p>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={Boolean(p.verfuegbar)}
                            onChange={() => handleVerfuegbarkeitUmschalten(p)}
                            className="w-3.5 h-3.5 accent-red-600"
                          />
                          Sichtbar
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setBearbeitetePizza(p); setPizzaFormOffen(true); }}
                            className="text-gray-400 hover:text-red-600 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => handlePizzaLoeschen(p)}
                            className="text-gray-400 hover:text-red-600 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Löschen
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Bestellungen */}
      {ansicht === 'bestellungen' && (
      <div className="max-w-4xl mx-auto px-4 py-5">
        {laedt && bestellungen.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-3 text-gray-300">
            <span className="text-5xl animate-spin">🍕</span>
            <p>Lädt …</p>
          </div>
        ) : gefiltert.length === 0 ? (
          <div className="text-center py-24 text-gray-300">
            <p className="text-5xl mb-3">📋</p>
            <p>Keine Bestellungen</p>
          </div>
        ) : (
          <div className="space-y-4">
            {gefiltert.map(b => {
              const s = STATUS[b.status] || STATUS.neu;
              return (
                <div key={b.id} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-red-600 font-mono">#{b.bestellnummer}</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.badge}`}>{s.label}</span>
                    </div>
                    <span className="text-sm text-gray-400">{formatZeit(b.erstellt_am)}</span>
                  </div>

                  <ul className="text-sm text-gray-500 space-y-0.5 mb-4">
                    {b.artikel.map((a, i) => (
                      <li key={i}>
                        <span className="font-semibold text-gray-700">{a.menge}×</span> {a.name} (30 cm)
                        <span className="text-gray-400 ml-1">· € {(a.preis * a.menge).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <span className="font-bold text-red-600 text-lg">
                      Gesamt: € {b.gesamtpreis.toFixed(2)}
                    </span>
                    {s.next ? (
                      <button
                        onClick={() => statusAendern(b.id, s.next)}
                        className={`${s.nextColor} text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors`}
                      >
                        {s.nextLabel}
                      </button>
                    ) : (
                      <span className="text-green-600 font-semibold text-sm flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Abgeschlossen
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
