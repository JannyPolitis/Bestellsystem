import { useState } from 'react';

export default function EventModal({ event, onClose, onSaved }) {
  const [datum, setDatum] = useState(event?.datum || '');
  const [uhrzeit, setUhrzeit] = useState(event?.uhrzeit || '');
  const [ort, setOrt] = useState(event?.ort || '');
  const [speichern, setSpeichern] = useState(false);
  const [fehler, setFehler] = useState('');

  const handleSpeichern = async (e) => {
    e.preventDefault();
    setFehler('');
    setSpeichern(true);
    try {
      const res = await fetch('/api/admin/event', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ datum, uhrzeit, ort }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFehler(d.error || 'Fehler beim Speichern');
        return;
      }
      const data = await res.json();
      onSaved(data.event);
    } catch {
      setFehler('Verbindungsfehler zum Server');
    } finally {
      setSpeichern(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <form
        onSubmit={handleSpeichern}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Nächstes Event</h2>
            <p className="text-sm text-gray-400 mt-0.5">Wird auf der Geschlossen-Seite angezeigt</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-300 hover:text-gray-500 text-3xl leading-none font-light">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Datum</label>
            <input
              type="date"
              value={datum}
              onChange={e => setDatum(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Uhrzeit</label>
            <input
              type="time"
              value={uhrzeit}
              onChange={e => setUhrzeit(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Ort</label>
            <input
              type="text"
              value={ort}
              onChange={e => setOrt(e.target.value)}
              placeholder="z.B. Marktplatz Musterstadt"
              maxLength={200}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {fehler && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
              {fehler}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-100 transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={speichern}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {speichern ? 'Speichert …' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}
