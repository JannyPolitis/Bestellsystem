import { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = (pizza, menge) => {
    setItems(prev => {
      const exists = prev.find(i => i.id === pizza.id);
      if (exists) {
        return prev.map(i => i.id === pizza.id ? { ...i, menge: i.menge + menge } : i);
      }
      return [...prev, { ...pizza, menge }];
    });
    setIsOpen(true);
  };

  const updateMenge = (id, menge) => {
    if (menge <= 0) {
      setItems(prev => prev.filter(i => i.id !== id));
    } else {
      setItems(prev => prev.map(i => i.id === id ? { ...i, menge } : i));
    }
  };

  const leeren = () => setItems([]);

  const gesamtanzahl = items.reduce((s, i) => s + i.menge, 0);
  const gesamtpreis = items.reduce((s, i) => s + i.preis * i.menge, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateMenge, leeren, gesamtanzahl, gesamtpreis, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
