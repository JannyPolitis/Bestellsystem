import { Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext.jsx';
import Home from './pages/Home.jsx';
import Checkout from './pages/Checkout.jsx';
import Confirmation from './pages/Confirmation.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <CartProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/kasse" element={<Checkout />} />
        <Route path="/bestaetigung/:bestellnummer" element={<Confirmation />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </CartProvider>
  );
}
