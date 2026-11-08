"use client";

import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, Plus, Minus, Trash2 } from "lucide-react";
import { useState } from "react";
import { playScannerBeep } from "./barcode-scanner";

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
  };
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const { items, addItem, updateQuantity, removeItem, allowNegativeInventory } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  // Check if this product is already in the cart
  const cartItem = items.find((i) => i.id === product.id);

  const handleAddFirst = () => {
    addItem({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      quantity: 1,
      available: product.quantity,
    });
    setJustAdded(true);
    playScannerBeep(true);
    setTimeout(() => setJustAdded(false), 800);
  };

  const handleIncrement = () => {
    if (!cartItem) {
      handleAddFirst();
      return;
    }
    if (!allowNegativeInventory && cartItem.quantity >= product.quantity) {
      return;
    }
    updateQuantity(product.id, cartItem.quantity + 1);
    playScannerBeep(true);
  };

  const handleDecrement = () => {
    if (!cartItem) return;
    if (cartItem.quantity <= 1) {
      removeItem(product.id);
      playScannerBeep(false);
    } else {
      updateQuantity(product.id, cartItem.quantity - 1);
      playScannerBeep(false);
    }
  };

  // If already in cart, show interactive quantity stepper right on the product card!
  if (cartItem) {
    const isMaxStock = !allowNegativeInventory && cartItem.quantity >= product.quantity;

    return (
      <div className="flex items-center justify-between bg-lime-50 dark:bg-lime-950/60 border-2 border-lime-500/80 rounded-xl p-1 shadow-sm transition-all animate-in zoom-in-95">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleDecrement}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg active:scale-90 transition-transform"
          title={cartItem.quantity === 1 ? "Remove from cart" : "Decrease quantity"}
        >
          {cartItem.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-4 w-4" />}
          <span className="sr-only">Decrease</span>
        </Button>

        <div className="text-center px-1">
          <div className="text-xs font-bold text-lime-900 dark:text-lime-200">
            {cartItem.quantity} in cart
          </div>
          <div className="text-[10px] font-semibold text-lime-700 dark:text-lime-400">
            ₵{(cartItem.quantity * product.price).toFixed(2)}
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isMaxStock}
          onClick={handleIncrement}
          className="h-8 w-8 p-0 text-lime-700 dark:text-lime-300 hover:text-lime-800 hover:bg-lime-200/60 dark:hover:bg-lime-900/60 rounded-lg active:scale-90 transition-transform disabled:opacity-40"
          title={isMaxStock ? "Maximum available stock reached" : "Add one more"}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Increase</span>
        </Button>
      </div>
    );
  }

  // Not in cart yet: 1-click Add button
  const isOutOfStock = !allowNegativeInventory && product.quantity <= 0;

  return (
    <Button
      onClick={handleAddFirst}
      disabled={isOutOfStock}
      className={`w-full h-9 text-white font-medium transition-all ${
        justAdded
          ? "bg-emerald-600 hover:bg-emerald-700 shadow-md ring-2 ring-emerald-400"
          : "bg-lime-600 hover:bg-lime-700"
      }`}
    >
      {justAdded ? (
        <>
          <Check className="mr-1 h-4 w-4 animate-in zoom-in" />
          Added!
        </>
      ) : isOutOfStock ? (
        "Out of Stock"
      ) : (
        <>
          <ShoppingCart className="mr-1.5 h-4 w-4" />
          Add to Cart
        </>
      )}
    </Button>
  );
}
