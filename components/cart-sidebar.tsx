"use client";

import { useCart } from "@/lib/cart-context";
import {
  ShoppingCart,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  Clock,
  Sparkles,
  PlayCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckoutForm } from "@/components/checkout-form";
import { playScannerBeep } from "./barcode-scanner";

/**
 * CartSidebar — Slim, fast-access cart panel that slides in from the right
 * ONLY when items are added or held carts exist. Disappears completely when
 * empty so products take full width. Designed for rapid multi-customer
 * switching and quick quantity edits without leaving the catalog.
 */
export function CartSidebar() {
  const {
    items,
    getTotal,
    updateQuantity,
    removeItem,
    clearCart,
    holdCurrentCart,
    resumeHeldCart,
    deleteHeldCart,
    heldCarts,
    allowNegativeInventory,
  } = useCart();

  const [showCheckout, setShowCheckout] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const prevItemsRef = useRef(items);
  const listEndRef = useRef<HTMLDivElement>(null);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const total = getTotal();

  // Detect newly added items for highlight + auto-scroll
  useEffect(() => {
    if (items.length > 0) {
      let newlyAdded: (typeof items)[0] | undefined;
      for (const item of items) {
        const prev = prevItemsRef.current.find((p) => p.id === item.id);
        if (!prev || item.quantity > prev.quantity) {
          newlyAdded = item;
          break;
        }
      }

      if (newlyAdded) {
        setLastAddedId(newlyAdded.id);
        setTimeout(() => {
          listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 80);

        const clearHighlight = setTimeout(() => setLastAddedId(null), 2500);
        return () => clearTimeout(clearHighlight);
      }
    } else {
      setLastAddedId(null);
    }

    prevItemsRef.current = items;
  }, [items]);

  const hasItems = totalItems > 0;
  const hasHeld = heldCarts.length > 0;

  // Return null — sidebar completely vanishes, products take full width
  if (!hasItems && !hasHeld) return null;

  return (
    <>
      <div className="animate-in slide-in-from-right-4 fade-in-50 duration-300 ease-out fill-mode-both">
        <div className="rounded-2xl border-2 border-lime-500/70 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl overflow-hidden flex flex-col max-h-[calc(100vh-170px)]">

          {/* ── Compact Header ── */}
          <div className="px-2.5 py-2 bg-gradient-to-r from-lime-50 to-emerald-50/50 dark:from-slate-800 dark:to-slate-800/80 border-b border-lime-200/50 dark:border-slate-700 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-lime-600 flex items-center justify-center text-white shrink-0">
                <ShoppingCart className="w-3.5 h-3.5" />
              </div>
              <span className="font-extrabold text-xs text-foreground truncate">
                {hasItems ? `${totalItems} item${totalItems !== 1 ? "s" : ""}` : "Cart"}
              </span>
              {hasItems && (
                <span className="font-black text-xs text-lime-700 dark:text-lime-400">
                  ₵{total.toFixed(2)}
                </span>
              )}
            </div>

            {hasItems && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => holdCurrentCart()}
                  className="h-6 px-1.5 rounded-md text-[10px] font-bold text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-950/40 flex items-center gap-0.5 transition-colors"
                  title="Hold & serve next customer"
                >
                  <PauseCircle className="w-3 h-3" />
                  Hold
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Clear all items?")) clearCart();
                  }}
                  className="h-6 w-6 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  title="Clear cart"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* ── Scrollable Items ── */}
          {hasItems ? (
            <div className="flex-1 overflow-y-auto overscroll-contain px-1.5 py-1 space-y-0 divide-y divide-border/30">
              {items.map((item) => {
                const isJustAdded = item.id === lastAddedId;
                return (
                  <div
                    key={item.id}
                    className={`py-1.5 flex items-center gap-1.5 text-[11px] rounded-lg px-1 transition-all duration-300 ${
                      isJustAdded
                        ? "bg-lime-100/90 dark:bg-lime-950/70 ring-1 ring-lime-400/50"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-[11px] truncate leading-tight flex items-center gap-1">
                        {item.name}
                        {isJustAdded && (
                          <Sparkles className="w-2.5 h-2.5 text-lime-600 shrink-0" />
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        ₵{item.price.toFixed(2)} ×{item.quantity} ={" "}
                        <span className="font-bold text-lime-700 dark:text-lime-400">
                          ₵{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </p>
                    </div>

                    {/* Compact Stepper */}
                    <div className="flex items-center shrink-0 bg-muted/50 dark:bg-slate-800 rounded-md border border-border/40">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.quantity <= 1) {
                            removeItem(item.id);
                          } else {
                            updateQuantity(item.id, item.quantity - 1);
                          }
                          playScannerBeep(false);
                        }}
                        className="h-5 w-5 flex items-center justify-center text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-l-md active:scale-90 transition-transform"
                      >
                        {item.quantity === 1 ? <Trash2 className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                      </button>
                      <span className="w-4 text-center font-black text-[10px] select-none">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={!allowNegativeInventory && item.quantity >= item.available}
                        onClick={() => {
                          updateQuantity(item.id, item.quantity + 1);
                          playScannerBeep(true);
                        }}
                        className="h-5 w-5 flex items-center justify-center text-lime-700 dark:text-lime-300 hover:bg-lime-100 dark:hover:bg-lime-900/40 disabled:opacity-30 rounded-r-md active:scale-90 transition-transform"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <div ref={listEndRef} />
            </div>
          ) : (
            <div className="py-3 text-center text-[11px] text-muted-foreground">
              <p className="font-medium">No active items</p>
            </div>
          )}

          {/* ── Held Sales — quick-switch between customers ── */}
          {hasHeld && (
            <div className="shrink-0 border-t border-orange-200/50 dark:border-orange-900/30 bg-orange-50/40 dark:bg-orange-950/15 px-2 py-1.5 space-y-1">
              <p className="text-[10px] font-bold text-orange-700 dark:text-orange-300 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Held ({heldCarts.length})
              </p>
              <div className="space-y-1 max-h-[90px] overflow-y-auto">
                {heldCarts.map((held) => {
                  const heldTotal = held.items.reduce(
                    (s, i) => s + i.price * i.quantity,
                    0
                  );
                  return (
                    <div
                      key={held.id}
                      className="flex items-center gap-1.5 p-1.5 bg-white/80 dark:bg-slate-800/70 rounded-lg border border-orange-200/40 dark:border-slate-700 text-[10px]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate leading-tight">
                          {held.name || `${held.items.length} item${held.items.length !== 1 ? "s" : ""}`}
                        </p>
                        <p className="text-muted-foreground leading-tight">
                          ₵{heldTotal.toFixed(2)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => resumeHeldCart(held.id)}
                        className="h-5 px-2 rounded bg-lime-600 hover:bg-lime-700 text-white text-[10px] font-bold flex items-center gap-0.5 shrink-0 active:scale-95 transition-transform"
                      >
                        <PlayCircle className="w-2.5 h-2.5" />
                        Resume
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteHeldCart(held.id)}
                        className="h-5 w-5 rounded flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 shrink-0"
                        title="Discard"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Footer: Review & Pay ── */}
          {hasItems && (
            <div className="shrink-0 border-t border-border px-2.5 py-2 bg-white dark:bg-slate-900 space-y-1.5">
              <Button
                onClick={() => setShowCheckout(true)}
                className="w-full h-9 bg-gradient-to-r from-lime-600 to-emerald-600 hover:from-lime-500 hover:to-emerald-500 text-white font-black text-xs rounded-xl gap-1.5 shadow-md shadow-lime-600/15 active:scale-[0.97] transition-all"
              >
                Review & Pay · ₵{total.toFixed(2)}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-lime-600" />
              <span>Review & Complete Payment</span>
            </DialogTitle>
          </DialogHeader>
          <CheckoutForm onClose={() => setShowCheckout(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
