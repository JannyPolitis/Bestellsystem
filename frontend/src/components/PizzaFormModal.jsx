import { useState, useRef } from 'react';

export default function PizzaFormModal({ pizza, onClose, onSaved }) {
  const bearbeitung = Boolean(pizza);
  const [name, setName] = useState(pizza?.name || '');
  const [beschreibung, setBeschreibung] = useState(pizza?.beschreibung || '');
  const [preis, setPreis] = useState(pizza?.preis ?? '');
  const [verfuegbar, setVerfuegbar] = useState(pizza ? Boolean(pizza.verfuegbar) : true);
  const [bildDatei, setBildDatei] = useState(null);
  const [bildVorschau, setBildVorschau] = useState(pizza?.bild_url || null);
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState('');
  const fileInputRef = useRef(null);

  const handleBildAuswahl = (e) => {
    const datei = e.target.files?.[0];
    if (!datei) return;
    setBildDatei(datei);
    setBildVorschau(URL.createObjectURL(datei));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFehler('');

    const preisZahl = parseFloat(preis);
    if (!name.trim()) return setFehler('Name darf nicht leer sein.');
    if (!Number.isFinite(preisZahl) || preisZahl <= 0) return setFehler('Bitte einen gueltigen Preis angeben.');

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('beschreibung', beschreibung.trim());
    formData.append('preis', String(preisZahl));
    formData.append('verfuegbar', String(verfuegbar));
    if (bildDatei) formData.append('bild', bildDatei);

    setSpeichert(true);
    try {
      const res = await fetch(bearbeitung ? `/api/admin/pizzas/${pizza.id}` : '/api/admin/pizzas', {
        method: bearbeitung ? 'PUT' : 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFehler(d.error || 'Fehler beim Speichern');
        setSpeichert(false);
        return;
      }
      onSaved(await res.json());
    } catch {
      setFehler('Verbindungsfehler zum Server');
      setSpeichert(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">{bearbeitung ? 'Pizza bearbeiten' : 'Neue Pizza'}</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-3xl leading-none font-light">×</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Bild */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Bild</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer h-36 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 hover:border-red-300 flex items-center justify-center overflow-hidden transition-colors"
            >
              {bildVorschau ? (
                <img src={bildVorschau} alt="Vorschau" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-sm flex flex-col items-center gap-1">
                  <span className="text-3xl">📷</span>
                  Bild auswaehlen
                </span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleBildAuswahl}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="z.B. Margherita"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Beschreibung</label>
            <textarea
              value={beschreibung}
              onChange={e => setBeschreibung(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              placeholder="z.B. Tomatensauce, Mozzarella, Basilikum"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Preis (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={preis}
              onChange={e => setPreis(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="9.50"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={verfuegbar}
              onChange={e => setVerfuegbar(e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />
            <span className="text-sm text-gray-600">Auf der Speisekarte sichtbar</span>
          </label>

          {fehler && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
              {fehler}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-100 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={speichert}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {speichert ? 'Speichert …' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
