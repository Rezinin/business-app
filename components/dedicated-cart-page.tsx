"use client";

import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  Clock,
  Package,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckoutForm } from "@/components/checkout-form";
import { playScannerBeep } from "./barcode-scanner";

export function DedicatedCartPage({
  onBrowseProducts,
}: {
  onBrowseProducts: () => void;
}) {
  const {
    items,
    removeItem,
    updateQuantity,
    getTotal,
    clearCart,
    allowNegativeInventory,
    heldCarts,
    holdCurrentCart,
    resumeHeldCart,
    deleteHeldCart,
  } = useCart();

  const [showHeldDialog, setShowHeldDialog] = useState(false);

  const total = getTotal();
  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="py-16 text-center max-w-md mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-lime-100 dark:bg-lime-950/50 border-2 border-lime-300 dark:border-lime-800 flex items-center justify-center">
          <ShoppingCart className="w-10 h-10 text-lime-600 dark:text-lime-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Your Cart is Currently Empty
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tap products in the catalog or scan barcodes to build your customer ticket
          </p>
        </div>

        {heldCarts.length > 0 && (
          <div className="p-4 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl text-left space-y-2">
            <p className="text-xs font-bold text-orange-800 dark:text-orange-200 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-600" />
              <span>You have {heldCarts.length} held sale(s) waiting</span>
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowHeldDialog(true)}
              className="w-full text-xs border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              Resume a Held Sale &rarr;
            </Button>
          </div>
        )}

        <Button
          onClick={onBrowseProducts}
          className="bg-lime-600 hover:bg-lime-700 text-white font-bold px-6 py-2.5 rounded-xl gap-2 shadow-md"
        >
          <Package className="w-4 h-4" />
          <span>Browse Products Catalog</span>
        </Button>

        {/* Held Sales Modal */}
        <Dialog open={showHeldDialog} onOpenChange={setShowHeldDialog}>
          <DialogContent className="max-w-md w-[95vw]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Held Sales ({heldCarts.length})
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 max-h-80 overflow-y-auto">
              {heldCarts.map((held) => {
                const heldTotal = held.items.reduce((s, i) => s + i.price * i.quantity, 0);
                return (
                  <div
                    key={held.id}
                    className="p-3 rounded-lg border bg-muted/40 space-y-2"
                  >
                    <div className="flex justify-between items-start text-xs">
                      <div>
                        <p className="font-semibold text-foreground">
                          {held.name || `${held.items.length} ${held.items.length === 1 ? "item" : "items"}`}
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          {new Date(held.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className="font-bold text-sm text-lime-700 dark:text-lime-400">
                        ₵{heldTotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          resumeHeldCart(held.id);
                          setShowHeldDialog(false);
                        }}
                        className="flex-1 bg-lime-600 hover:bg-lime-700 text-white text-xs h-8"
                      >
                        Resume
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteHeldCart(held.id)}
                        className="h-8 px-2 text-red-600 hover:text-red-700 text-xs"
                      >
                        Discard
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
      {/* Ticket Header & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-lime-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-lime-600" />
            <span>Customer Ticket & Active Cart</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Review line items, adjust quantities, hold tickets, and settle payment
          </p>
        </div>

        <div className="flex items-center gap-2">
          {heldCarts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHeldDialog(true)}
              className="h-9 gap-1.5 border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 text-xs"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Held ({heldCarts.length})</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => holdCurrentCart()}
            className="h-9 gap-1.5 border-lime-300 text-lime-800 hover:bg-lime-50 text-xs font-semibold"
          >
            <PauseCircle className="w-3.5 h-3.5 text-lime-600" />
            <span>Hold Sale</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Clear all items from active cart?")) {
                clearCart();
              }
            }}
            className="h-9 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            <span>Clear</span>
          </Button>
        </div>
      </div>

      {/* Main Split Section: Items Table (Left 7 cols) + Payment Summary (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Line Items Table */}
        <div className="lg:col-span-7 space-y-3">
          <Card className="border-border">
            <CardHeader className="p-4 pb-2 border-b">
              <CardTitle className="text-sm font-semibold flex justify-between items-center">
                <span>Line Items ({totalItems} total)</span>
                <span className="text-muted-foreground font-normal text-xs">
                  Tap + / - to change quantity
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/60">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm sm:text-base text-foreground truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      SKU: {item.sku || "N/A"} &bull; Unit:{" "}
                      <span className="font-semibold text-foreground">
                        ₵{item.price.toFixed(2)}
                      </span>
                    </p>
                  </div>

                  {/* Large Quantity Stepper */}
                  <div className="flex items-center gap-1.5 bg-muted/60 dark:bg-slate-800 rounded-xl p-1 border border-border">
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
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-100/60 dark:hover:bg-red-950/60 active:scale-90 transition-transform"
                      title="Decrease"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="w-4 h-4" />
                      ) : (
                        <Minus className="w-4 h-4" />
                      )}
                    </button>

                    <span className="w-8 text-center font-extrabold text-sm sm:text-base text-foreground">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      disabled={!allowNegativeInventory && item.quantity >= item.available}
                      onClick={() => {
                        updateQuantity(item.id, item.quantity + 1);
                        playScannerBeep(true);
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lime-700 dark:text-lime-300 hover:bg-lime-200/60 dark:hover:bg-lime-900/60 active:scale-90 transition-transform disabled:opacity-30"
                      title="Increase"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right min-w-[70px] sm:min-w-[90px]">
                    <div className="font-extrabold text-base sm:text-lg text-lime-700 dark:text-lime-400">
                      ₵{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-between items-center p-3 rounded-xl border border-dashed border-border bg-muted/20">
            <Button
              variant="outline"
              size="sm"
              onClick={onBrowseProducts}
              className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Add More Products from Catalog</span>
            </Button>

            <span className="text-xs text-muted-foreground">
              {items.length} unique products
            </span>
          </div>
        </div>

        {/* Direct Payment & Checkout Column (Embedded directly - zero extra popup clicks!) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <Card className="border-2 border-lime-500 shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="p-4 pb-3 bg-gradient-to-r from-lime-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800/80 border-b border-lime-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-extrabold flex items-center gap-2 text-foreground">
                  <ShoppingCart className="w-4 h-4 text-lime-600" />
                  <span>Settle Payment & Print Receipt</span>
                </CardTitle>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-lime-600 text-white">
                  ₵{total.toFixed(2)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <CheckoutForm onClose={onBrowseProducts} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Held Sales Modal */}
      <Dialog open={showHeldDialog} onOpenChange={setShowHeldDialog}>
        <DialogContent className="max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Held Sales ({heldCarts.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-80 overflow-y-auto">
            {heldCarts.map((held) => {
              const heldTotal = held.items.reduce((s, i) => s + i.price * i.quantity, 0);
              return (
                <div
                  key={held.id}
                  className="p-3 rounded-lg border bg-muted/40 space-y-2"
                >
                  <div className="flex justify-between items-start text-xs">
                    <div>
                      <p className="font-semibold text-foreground">
                        {held.name || `${held.items.length} ${held.items.length === 1 ? "item" : "items"}`}
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        {new Date(held.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className="font-bold text-sm text-lime-700 dark:text-lime-400">
                      ₵{heldTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        resumeHeldCart(held.id);
                        setShowHeldDialog(false);
                      }}
                      className="flex-1 bg-lime-600 hover:bg-lime-700 text-white text-xs h-8"
                    >
                      Resume
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteHeldCart(held.id)}
                      className="h-8 px-2 text-red-600 hover:text-red-700 text-xs"
                    >
                      Discard
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
