"use client";

import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";

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
  const { addItem, allowNegativeInventory } = useCart();
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      quantity: quantity,
      available: product.quantity,
    });
    setQuantity(1); // Reset quantity
  };

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <label htmlFor={`qty-${product.id}`} className="text-xs text-muted-foreground">
          Qty
        </label>
        <Input
          id={`qty-${product.id}`}
          type="number"
          min="1"
            max={allowNegativeInventory ? undefined : product.quantity}
            value={quantity}
            onChange={(e) => {
              const nextQuantity = Math.max(1, parseInt(e.target.value) || 1);
              setQuantity(allowNegativeInventory ? nextQuantity : Math.min(nextQuantity, product.quantity));
            }}
          className="h-9 mt-1"
        />
      </div>
      <Button
        onClick={handleAddToCart}
        className="flex-1 bg-lime-600 hover:bg-lime-700 text-white h-9"
        disabled={!allowNegativeInventory && product.quantity === 0}
      >
        <ShoppingCart className="mr-1 h-4 w-4" />
        Add
      </Button>
    </div>
  );
}
