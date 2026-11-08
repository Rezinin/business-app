"use client";

import { useCart } from "@/lib/cart-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingCart, PauseCircle, PlayCircle, Plus, Minus, Clock } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckoutForm } from "@/components/checkout-form";

export function CartSummary() {
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

  const [showCheckout, setShowCheckout] = useState(false);
  const [showHeldDialog, setShowHeldDialog] = useState(false);

  const total = getTotal();

  const handleHold = () => {
    if (items.length === 0) return;
    holdCurrentCart();
  };

  return (
    <>
      <Card className="border-lime-200 dark:border-lime-900 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5 text-lime-600 dark:text-lime-400" />
              Cart {items.length > 0 && <span className="text-sm font-normal text-muted-foreground">({items.length} {items.length === 1 ? "item" : "items"})</span>}
            </CardTitle>

            {heldCarts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHeldDialog(true)}
                className="h-8 gap-1.5 border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 hover:bg-orange-100"
              >
                <Clock className="h-3.5 w-3.5" />
                Held Sales ({heldCarts.length})
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground border-2 border-dashed border-lime-100 dark:border-slate-800 rounded-xl bg-lime-50/50 dark:bg-slate-900/40">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-lime-400 opacity-60" />
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs text-muted-foreground mt-1">Tap products or scan barcodes to begin sale</p>

              {heldCarts.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border mx-6">
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                    You have {heldCarts.length} held sale(s) waiting
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowHeldDialog(true)}
                    className="text-xs text-lime-600 dark:text-lime-400 mt-1"
                  >
                    View & Resume Held Sales &rarr;
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="space-y-2 mb-4 max-h-[340px] overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-muted/60 dark:bg-slate-800/60 rounded-lg border border-border/50 text-sm"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium text-xs md:text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ₵{item.price.toFixed(2)} each &bull; Total: <span className="font-semibold text-foreground">₵{(item.price * item.quantity).toFixed(2)}</span>
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 rounded-md"
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>

                      <input
                        type="number"
                        min="1"
                        max={allowNegativeInventory ? undefined : item.available}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-10 h-6 px-1 border rounded text-center text-xs bg-background font-semibold"
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 rounded-md"
                        disabled={!allowNegativeInventory && item.quantity >= item.available}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 ml-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t pt-3 space-y-1 mb-4 text-sm">
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Subtotal</span>
                  <span>₵{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-1 border-t border-border/50">
                  <span>Total Amount</span>
                  <span className="text-lime-600 dark:text-lime-400">₵{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={() => setShowCheckout(true)}
                  className="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold py-2.5 shadow-sm"
                >
                  Checkout (₵{total.toFixed(2)})
                </Button>

                <div className="flex gap-2">
                  <Button
                    onClick={handleHold}
                    variant="outline"
                    className="flex-1 text-xs gap-1 border-orange-200 dark:border-orange-900 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                  >
                    <PauseCircle className="h-3.5 w-3.5" />
                    Hold Sale
                  </Button>
                  <Button
                    onClick={clearCart}
                    variant="ghost"
                    className="flex-1 text-xs text-muted-foreground hover:text-red-600"
                  >
                    Clear Cart
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Checkout Dialog - Never locked */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw]">
          <DialogHeader>
            <DialogTitle>Complete Order</DialogTitle>
            <DialogDescription>
              Review the order, complete payment, and print or download the receipt.
            </DialogDescription>
          </DialogHeader>
          <CheckoutForm
            onClose={() => {
              setShowCheckout(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Held Sales Dialog */}
      <Dialog open={showHeldDialog} onOpenChange={setShowHeldDialog}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Held Sales ({heldCarts.length})
            </DialogTitle>
            <DialogDescription>
              Resume any previously held sale to continue checkout.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-3">
            {heldCarts.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No sales currently on hold.</p>
            ) : (
              heldCarts.map((held) => {
                const heldTotal = held.items.reduce((s, i) => s + i.price * i.quantity, 0);
                return (
                  <div
                    key={held.id}
                    className="p-3 border rounded-lg flex items-center justify-between gap-3 bg-card hover:bg-accent/40 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{held.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {held.items.length} items &bull; ₵{heldTotal.toFixed(2)} &bull; {new Date(held.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          resumeHeldCart(held.id);
                          setShowHeldDialog(false);
                        }}
                        className="bg-lime-600 hover:bg-lime-700 text-white text-xs gap-1 h-8"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        Resume
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteHeldCart(held.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        title="Discard held sale"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
