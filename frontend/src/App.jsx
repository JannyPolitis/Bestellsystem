import { Routes, Route } from 'react-router-dom';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { CartProvider } from './context/CartContext.jsx';
import Home from './pages/Home.jsx';
import Checkout from './pages/Checkout.jsx';
import Confirmation from './pages/Confirmation.jsx';
import Admin from './pages/Admin.jsx';

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test';

export default function App() {
  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'EUR', locale: 'de_DE' }}>
      <CartProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/kasse" element={<Checkout />} />
          <Route path="/bestaetigung/:bestellnummer" element={<Confirmation />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </CartProvider>
    </PayPalScriptProvider>
  );
}
