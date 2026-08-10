import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import logo from '../Logo/PizzaSquad.png';

export default function Navbar() {
  const { gesamtanzahl, setIsOpen } = useCart();

  return (
    <nav className="fixed top-0 left-0 right-0 z-30 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-800 hover:text-red-600 transition-colors">
          <img src={logo} alt="Pizza Squad" className="w-10 h-10 rounded-full object-cover" />
          <span>Pizza Squad</span>
        </Link>

        <button
          onClick={() => setIsOpen(true)}
          className="relative flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors font-semibold"
        >
          <span>🛒</span>
          <span className="hidden sm:inline">Warenkorb</span>
          {gesamtanzahl > 0 && (
            <span className="absolute -top-2 -right-2 bg-orange-400 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {gesamtanzahl > 99 ? '99+' : gesamtanzahl}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}
