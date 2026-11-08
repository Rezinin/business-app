"use client";

import { useCart } from "@/lib/cart-context";
import {
  ShoppingCart,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  ExternalLink,
  Sparkles,
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

export function FloatingCartBar({
  onOpenFullCart,
}: {
  onOpenFullCart?: () => void;
}) {
  const {
    items,
    getTotal,
    updateQuantity,
    removeItem,
    clearCart,
    holdCurrentCart,
    allowNegativeInventory,
  } = useCart();

  const [pulse, setPulse] = useState(false);
  // Auto-expand by default so items, names, prices, and quantities show directly!
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [lastAddedName, setLastAddedName] = useState<string | null>(null);

  const prevItemsRef = useRef(items);
  const userCollapsedRef = useRef(false);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const total = getTotal();

  // Watch for newly added items or quantity changes to show details directly
  useEffect(() => {
    if (items.length > 0) {
      // Find what was added or updated
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
        setLastAddedName(newlyAdded.name);
        setPulse(true);

        // Directly open the items list when something is added so cashiers see it instantly!
        setIsExpanded(true);
        userCollapsedRef.current = false;

        const timer = setTimeout(() => {
          setPulse(false);
        }, 1200);

        const clearHighlight = setTimeout(() => {
          setLastAddedId(null);
        }, 3000);

        return () => {
          clearTimeout(timer);
          clearTimeout(clearHighlight);
        };
      }
    } else {
      setIsExpanded(false);
      userCollapsedRef.current = false;
      setLastAddedId(null);
      setLastAddedName(null);
    }

    prevItemsRef.current = items;
  }, [items]);

  if (totalItems === 0) return null;

  const handleToggleExpand = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    if (!nextState) {
      userCollapsedRef.current = true;
    } else {
      userCollapsedRef.current = false;
    }
  };

  return (
    <>
      {/* Floating Strategic Cart Dock (Non-invasive bottom-right position) */}
      <div className="fixed bottom-4 right-3 sm:right-6 md:right-8 z-50 pointer-events-auto max-w-[420px] w-[calc(100vw-24px)] sm:w-[400px]">
        {/* Expanded View: Items shown directly with names, prices, quantities, and steppers */}
        {isExpanded && (
          <div
            className={`mb-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-lime-500 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-3 duration-200 transition-all ${
              pulse ? "ring-4 ring-lime-400/50 shadow-lime-500/30" : ""
            }`}
          >
            {/* Dock Header */}
            <div className="p-3 bg-gradient-to-r from-lime-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800/80 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-lime-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-extrabold text-sm text-foreground truncate block">
                    Active Cart ({totalItems} {totalItems === 1 ? "item" : "items"})
                  </span>
                  {lastAddedName && (
                    <span className="text-[10px] text-lime-700 dark:text-lime-400 font-medium truncate block flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      Just added: {lastAddedName}
                    </span>
                  )}
                </div>
              </div>

              {/* Minimize / Collapse Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleExpand}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                title="Minimize cart dock"
              >
                <span>Minimize</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Scrollable Items List - Direct View */}
            <div className="p-2 max-h-[220px] sm:max-h-[240px] overflow-y-auto space-y-1 divide-y divide-border/40">
              {items.map((item) => {
                const isJustAdded = item.id === lastAddedId;
                return (
                  <div
                    key={item.id}
                    className={`pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs rounded-xl p-1.5 transition-all ${
                      isJustAdded
                        ? "bg-lime-100/90 dark:bg-lime-950/80 border border-lime-400 ring-1 ring-lime-400/40"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-foreground text-xs sm:text-sm truncate">
                          {item.name}
                        </p>
                        {isJustAdded && (
                          <span className="shrink-0 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-lime-600 text-white animate-in zoom-in">
                            Added
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        ₵{item.price.toFixed(2)} each &bull;{" "}
                        <span className="font-bold text-lime-700 dark:text-lime-400">
                          ₵{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </p>
                    </div>

                    {/* Direct Inline Quantity Stepper */}
                    <div className="flex items-center gap-1 shrink-0 bg-muted/70 dark:bg-slate-800 rounded-lg p-0.5 border border-border/60">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.quantity <= 1) {
                            removeItem(item.id);
                            playScannerBeep(false);
                          } else {
                            updateQuantity(item.id, item.quantity - 1);
                            playScannerBeep(false);
                          }
                        }}
                        className="h-6 w-6 rounded flex items-center justify-center text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 active:scale-90 transition-transform"
                        title={item.quantity === 1 ? "Remove item" : "Decrease quantity"}
                      >
                        {item.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      </button>

                      <span className="w-6 text-center font-black text-xs">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        disabled={!allowNegativeInventory && item.quantity >= item.available}
                        onClick={() => {
                          updateQuantity(item.id, item.quantity + 1);
                          playScannerBeep(true);
                        }}
                        className="h-6 w-6 rounded flex items-center justify-center text-lime-700 dark:text-lime-300 hover:bg-lime-100 dark:hover:bg-lime-900/40 disabled:opacity-30 active:scale-90 transition-transform"
                        title="Add one more"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dock Footer: Actions & Direct Final Phase Review & Pay */}
            <div className="p-3 bg-muted/30 dark:bg-slate-800/60 border-t border-border space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Clear all items from current cart?")) {
                        clearCart();
                      }
                    }}
                    className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      holdCurrentCart();
                      setIsExpanded(false);
                    }}
                    className="h-7 px-2 text-xs gap-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <PauseCircle className="w-3 h-3" />
                    Hold
                  </Button>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total:</span>{" "}
                  <span className="font-black text-base sm:text-lg text-lime-700 dark:text-lime-400">
                    ₵{total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Direct Final Phase: Review & Pay Button */}
              <Button
                onClick={() => setShowCheckout(true)}
                className="w-full h-11 bg-gradient-to-r from-lime-600 to-emerald-600 hover:from-lime-500 hover:to-emerald-500 text-white font-black text-sm rounded-xl gap-2 shadow-lg shadow-lime-600/25 active:scale-95 transition-all"
              >
                <span>Review & Pay (₵{total.toFixed(2)})</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              {onOpenFullCart && (
                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExpanded(false);
                      onOpenFullCart();
                    }}
                    className="text-[11px] font-medium text-muted-foreground hover:text-lime-700 dark:hover:text-lime-400 inline-flex items-center gap-1 transition-colors"
                  >
                    <span>Open full ticket workspace</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Minimized Single Persistent Bar */}
        {!isExpanded && (
          <div
            className={`bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white border-2 border-lime-500 rounded-2xl shadow-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 sm:gap-3 transition-transform duration-300 ${
              pulse ? "scale-105 shadow-lime-500/30 ring-2 ring-lime-400" : "scale-100"
            }`}
          >
            {/* Left: Tap to Expand & View Items */}
            <button
              type="button"
              onClick={handleToggleExpand}
              className="flex items-center gap-2.5 text-left group hover:opacity-90 active:scale-95 transition-all pl-1 flex-1 min-w-0"
              title="Click to see items in cart"
            >
              <div className="relative shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-lime-600 flex items-center justify-center shadow-inner group-hover:bg-lime-500 transition-colors">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-bold text-[10px] sm:text-[11px] rounded-full h-4 sm:h-5 min-w-[18px] sm:min-w-[20px] px-1 flex items-center justify-center border-2 border-slate-900 animate-in zoom-in">
                  {totalItems}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[11px] sm:text-xs text-lime-300 font-semibold flex items-center gap-1">
                  <span>Show {totalItems} {totalItems === 1 ? "item" : "items"}</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </div>
                <div className="text-sm sm:text-base font-extrabold text-white truncate">
                  {lastAddedName ? (
                    <span className="text-lime-200 truncate">Added: {lastAddedName}</span>
                  ) : (
                    <span>₵{total.toFixed(2)}</span>
                  )}
                </div>
              </div>
            </button>

            {/* Right: Direct Checkout Button */}
            <Button
              onClick={() => setShowCheckout(true)}
              className="bg-lime-500 hover:bg-lime-400 text-slate-950 font-black h-9 sm:h-10 px-3 sm:px-4 rounded-xl gap-1.5 shadow-md active:scale-95 transition-all text-xs sm:text-sm shrink-0"
            >
              <span>Review & Pay</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Direct Final Phase: Checkout & Payment Modal */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-lime-600" />
              <span>Review & Complete Payment</span>
            </DialogTitle>
          </DialogHeader>
          <CheckoutForm
            onClose={() => {
              setShowCheckout(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
