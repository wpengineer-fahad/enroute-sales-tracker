import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
}

interface CartCtx {
  items: CartItem[];
  add: (item: CartItem) => void;
  updateQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  total: number;
  count: number;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.productId === item.productId);
      if (existing) {
        const newQty = Math.min(existing.quantity + item.quantity, item.maxStock);
        return prev.map((p) => p.productId === item.productId ? { ...p, quantity: newQty, maxStock: item.maxStock } : p);
      }
      return [...prev, item];
    });
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    setItems((prev) => prev.map((p) => p.productId === productId ? { ...p, quantity: Math.max(1, Math.min(qty, p.maxStock)) } : p));
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((p) => p.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Ctx.Provider value={{ items, add, updateQty, remove, clear, total, count }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
