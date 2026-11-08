"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  available: number;
}

export interface HeldCart {
  id: string;
  name: string;
  createdAt: string;
  items: CartItem[];
  customerName?: string;
  customerPhone?: string;
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
  heldCarts: HeldCart[];
  holdCurrentCart: (label?: string) => boolean;
  resumeHeldCart: (heldCartId: string) => void;
  deleteHeldCart: (heldCartId: string) => void;
  isHydrated: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const ACTIVE_CART_STORAGE_KEY = "rezinin_pos_active_cart";
const HELD_CARTS_STORAGE_KEY = "rezinin_pos_held_carts";

export function CartProvider({
  children,
  allowNegativeInventory: initialAllowNegativeInventory = false,
}: {
  children: React.ReactNode;
  allowNegativeInventory?: boolean;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [allowNegativeInventory, setAllowNegativeInventory] = useState(initialAllowNegativeInventory);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage once on client mount
  useEffect(() => {
    try {
      const savedActiveCart = localStorage.getItem(ACTIVE_CART_STORAGE_KEY);
      if (savedActiveCart) {
        const parsed = JSON.parse(savedActiveCart);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }

      const savedHeldCarts = localStorage.getItem(HELD_CARTS_STORAGE_KEY);
      if (savedHeldCarts) {
        const parsedHeld = JSON.parse(savedHeldCarts);
        if (Array.isArray(parsedHeld)) {
          setHeldCarts(parsedHeld);
        }
      }
    } catch (e) {
      console.warn("Failed to load cart from localStorage:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save active cart to localStorage whenever it changes (after initial hydration)
  useEffect(() => {
    if (!isHydrated) return;
    try {
      if (items.length === 0) {
        localStorage.removeItem(ACTIVE_CART_STORAGE_KEY);
      } else {
        localStorage.setItem(ACTIVE_CART_STORAGE_KEY, JSON.stringify(items));
      }
    } catch (e) {
      console.warn("Failed to persist active cart:", e);
    }
  }, [items, isHydrated]);

  // Save held carts to localStorage whenever they change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      if (heldCarts.length === 0) {
        localStorage.removeItem(HELD_CARTS_STORAGE_KEY);
      } else {
        localStorage.setItem(HELD_CARTS_STORAGE_KEY, JSON.stringify(heldCarts));
      }
    } catch (e) {
      console.warn("Failed to persist held carts:", e);
    }
  }, [heldCarts, isHydrated]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
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

  const holdCurrentCart = (label?: string): boolean => {
    if (items.length === 0) return false;

    const newHeldCart: HeldCart = {
      id: `held_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: label || `Sale #${heldCarts.length + 1} (${items.length} items)`,
      createdAt: new Date().toISOString(),
      items: [...items],
    };

    setHeldCarts((prev) => [newHeldCart, ...prev]);
    setItems([]);
    return true;
  };

  const resumeHeldCart = (heldCartId: string) => {
    const target = heldCarts.find((c) => c.id === heldCartId);
    if (!target) return;

    // If current cart already has items, park them first so nothing is lost
    if (items.length > 0) {
      const parkedCurrent: HeldCart = {
        id: `held_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: `Sale #${heldCarts.length} (${items.length} items)`,
        createdAt: new Date().toISOString(),
        items: [...items],
      };
      setHeldCarts((prev) => [
        parkedCurrent,
        ...prev.filter((c) => c.id !== heldCartId),
      ]);
    } else {
      setHeldCarts((prev) => prev.filter((c) => c.id !== heldCartId));
    }

    setItems(target.items);
  };

  const deleteHeldCart = (heldCartId: string) => {
    setHeldCarts((prev) => prev.filter((c) => c.id !== heldCartId));
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
        heldCarts,
        holdCurrentCart,
        resumeHeldCart,
        deleteHeldCart,
        isHydrated,
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
