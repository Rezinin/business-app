"use client";

import { createContext, useContext, useState } from "react";

export interface CartItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  available: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  allowNegativeInventory: boolean;
  setAllowNegativeInventory: (allow: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({
  children,
  allowNegativeInventory: initialAllowNegativeInventory = false,
}: {
  children: React.ReactNode;
  allowNegativeInventory?: boolean;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [allowNegativeInventory, setAllowNegativeInventory] = useState(initialAllowNegativeInventory);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        // Item already in cart, increase quantity
        return prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                quantity: allowNegativeInventory
                  ? i.quantity + item.quantity
                  : Math.min(i.quantity + item.quantity, i.available),
              }
            : i
        );
      }
      // New item
      return [
        ...prev,
        {
          ...item,
          quantity: allowNegativeInventory ? item.quantity : Math.min(item.quantity, item.available),
        },
      ];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const newQty = allowNegativeInventory
              ? Math.max(1, quantity)
              : Math.max(0, Math.min(quantity, i.available));
            return { ...i, quantity: newQty };
          }
          return i;
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotal = () => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getItemCount = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotal,
        getItemCount,
        allowNegativeInventory,
        setAllowNegativeInventory,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
