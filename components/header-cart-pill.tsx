"use client";

import { useCart } from "@/lib/cart-context";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeaderCartPill() {
  const { items, getTotal } = useCart();
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const total = getTotal();

  const handleScrollToCart = () => {
    const el = document.getElementById("cart-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-4", "ring-lime-400", "transition-all");
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-lime-400");
      }, 1500);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleScrollToCart}
      className={`rounded-lg h-9 gap-2 transition-all font-semibold text-xs md:text-sm ${
        totalItems > 0
          ? "border-lime-500 bg-lime-50 dark:bg-lime-950/40 text-lime-800 dark:text-lime-300 hover:bg-lime-100 shadow-sm"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
      title="Jump to Cart"
    >
      <div className="relative">
        <ShoppingCart className="w-4 h-4 text-lime-600 dark:text-lime-400" />
        {totalItems > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full h-4 min-w-[16px] px-0.5 flex items-center justify-center font-bold">
            {totalItems}
          </span>
        )}
      </div>
      <span>
        Cart {totalItems > 0 ? `(${totalItems}) · ₵${total.toFixed(2)}` : "(0)"}
      </span>
    </Button>
  );
}
