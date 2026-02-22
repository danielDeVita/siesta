"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

type CartProduct = {
  productId: string;
  slug: string;
  title: string;
  priceArs: number;
  imageUrl: string | null;
  stock: number;
};

export type CartStateItem = CartProduct & {
  quantity: number;
};

type CartContextValue = {
  items: CartStateItem[];
  totalItems: number;
  subtotal: number;
  addItem: (item: CartProduct, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

const CART_KEY = "siesta_cart_v1";

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartStateItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CartStateItem[];
      if (Array.isArray(parsed)) {
        setItems(parsed);
      }
    } catch {
      localStorage.removeItem(CART_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: CartProduct, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((entry) => entry.productId === item.productId);
      if (!existing) {
        return [...current, { ...item, quantity: Math.min(quantity, item.stock) }];
      }

      return current.map((entry) =>
        entry.productId === item.productId
          ? {
              ...entry,
              stock: item.stock,
              quantity: Math.min(entry.quantity + quantity, item.stock)
            }
          : entry
      );
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((entry) => entry.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) =>
      current
        .map((entry) => {
          if (entry.productId !== productId) {
            return entry;
          }
          return {
            ...entry,
            quantity: Math.max(1, Math.min(quantity, entry.stock))
          };
        })
        .filter((entry) => entry.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = useMemo(
    () => items.reduce((accumulator, item) => accumulator + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((accumulator, item) => accumulator + item.priceArs * item.quantity, 0),
    [items]
  );

  const value: CartContextValue = useMemo(
    () => ({
      items,
      totalItems,
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      clearCart
    }),
    [addItem, clearCart, items, removeItem, subtotal, totalItems, updateQuantity]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
