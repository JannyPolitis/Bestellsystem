import logo from '../Logo/PizzaSquad.png';

function formatDatum(datum) {
  if (!datum) return '';
  const [jahr, monat, tag] = datum.split('-').map(Number);
  return new Date(jahr, monat - 1, tag).toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function Geschlossen({ event }) {
  const hatEvent = event && (event.datum || event.uhrzeit || event.ort);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#FFF8F2' }}>
      <div className="max-w-md w-full text-center">
        <img src={logo} alt="Pizza Squad" className="w-32 h-32 rounded-full object-cover mx-auto mb-6 shadow-md" />
        <h1 className="text-3xl font-bold text-gray-800 mb-3">Wir haben aktuell geschlossen</h1>
        <p className="text-gray-500 text-lg mb-8">Wir sind bald wieder für dich da!</p>

        {hatEvent && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">Nächstes Event</p>
            {event.datum && <p className="text-lg font-bold text-gray-800">{formatDatum(event.datum)}</p>}
            {event.uhrzeit && <p className="text-gray-600 mt-1">ab {event.uhrzeit} Uhr</p>}
            {event.ort && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.ort)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:text-red-700 hover:underline mt-1 inline-block font-medium"
              >
                📍 {event.ort}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
