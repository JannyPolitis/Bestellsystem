import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

const SCHRITTE = ['Bestellt', 'In Zubereitung', 'Abholbereit'];

const STATUS_CONFIG = {
  neu: {
    schritt: 0,
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconFarbe: 'text-blue-500',
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    titel: 'Bestellung eingegangen!',
    text: 'Deine Bestellung wurde erfolgreich aufgegeben. Bitte bar bei Abholung bezahlen.',
    hinweis: 'Diese Seite aktualisiert sich automatisch.',
  },
  in_arbeit: {
    schritt: 1,
    bg: 'bg-orange-50',
    iconBg: 'bg-orange-100',
    iconFarbe: 'text-orange-500',
    icon: <span className="text-4xl animate-spin inline-block">🍕</span>,
    titel: 'Deine Pizza wird gemacht!',
    text: 'Wir bereiten deine Bestellung gerade frisch zu.',
    hinweis: 'Noch ein bisschen Geduld — gleich ist sie fertig!',
  },
  fertig: {
    schritt: 2,
    bg: 'bg-green-50',
    iconBg: 'bg-green-100',
    iconFarbe: 'text-green-500',
    icon: <span className="text-4xl">🎉</span>,
    titel: 'Deine Pizza ist fertig!',
    text: 'Bitte hole deine Bestellung jetzt ab.',
    hinweis: null,
  },
};

function Fortschrittsleiste({ schritt }) {
  return (
    <div className="flex items-center w-full">
      {SCHRITTE.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-500 ${
              i <= schritt ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              {i < schritt ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={`text-xs mt-1.5 font-medium text-center whitespace-nowrap ${
              i <= schritt ? 'text-gray-700' : 'text-gray-400'
            }`}>
              {label}
            </span>
          </div>
          {i < SCHRITTE.length - 1 && (
            <div className={`flex-1 h-1 mx-2 mb-4 rounded transition-colors duration-500 ${
              i < schritt ? 'bg-red-600' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Confirmation() {
  const { bestellnummer } = useParams();
  const decodedNr = decodeURIComponent(bestellnummer);
  const [status, setStatus] = useState('neu');
  const pollingRef = useRef(true);

  useEffect(() => {
    pollingRef.current = true;

    const poll = async () => {
      if (!pollingRef.current) return;
      try {
        const res = await fetch(`/api/bestellung/${encodeURIComponent(decodedNr)}/status`);
        if (res.ok) {
          const data = await res.json();
          const neuerStatus = data.status || 'neu';
          setStatus(neuerStatus);
          if (neuerStatus === 'fertig') pollingRef.current = false;
        } else if (res.status === 404) {
          pollingRef.current = false;
        }
      } catch {
        // Netzwerkfehler – letzten Status behalten
      }
    };

    poll();
    const interval = setInterval(poll, 4000);
    return () => { pollingRef.current = false; clearInterval(interval); };
  }, [decodedNr]);

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.neu;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: '#FFF8F2' }}>
      <div className="max-w-md w-full">

        {/* Status-Karte */}
        <div className={`${cfg.bg} rounded-2xl p-6 mb-5 transition-all duration-500`}>
          <div className="flex items-center gap-4 mb-3">
            <div className={`${cfg.iconBg} ${cfg.iconFarbe} w-16 h-16 rounded-full flex items-center justify-center shrink-0`}>
              {cfg.icon}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{cfg.titel}</h1>
              <p className="text-gray-500 text-sm mt-0.5">{cfg.text}</p>
            </div>
          </div>
          {cfg.hinweis && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" />
              {cfg.hinweis}
            </p>
          )}
        </div>

        {/* Bestellnummer */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Deine Bestellnummer</p>
          <p className="text-6xl font-bold text-red-600 font-mono tracking-widest text-center py-2">
            {decodedNr}
          </p>
          {status === 'fertig' && (
            <p className="text-center text-green-600 font-semibold mt-3 text-sm">
              Bitte hole deine Bestellung ab! 🍕
            </p>
          )}
        </div>

        {/* Fortschrittsleiste */}
        <div className="bg-white rounded-2xl shadow-md p-5 mb-6">
          <Fortschrittsleiste schritt={cfg.schritt} />
        </div>

        <div className="text-center">
          <Link
            to="/"
            className="inline-block text-gray-400 hover:text-gray-600 text-sm underline underline-offset-2"
          >
            Neue Bestellung aufgeben
          </Link>
        </div>
      </div>
    </div>
  );
}
