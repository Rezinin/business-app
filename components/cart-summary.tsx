"use client";

import { useCart } from "@/lib/cart-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ShoppingCart } from "lucide-react";
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
  const { items, removeItem, updateQuantity, getTotal, clearCart, allowNegativeInventory } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [closeBlocked, setCloseBlocked] = useState(false);

  if (items.length === 0) {
    return (
      <Card className="border-2 border-dashed border-lime-200 dark:border-lime-900 bg-lime-50 dark:bg-slate-800/50">
        <CardContent className="py-8 text-center text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-lime-400 opacity-50" />
          <p>No items in cart. Add products to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-lime-200 dark:border-lime-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-lime-600 dark:text-lime-400" />
            Shopping Cart ({items.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ₵{item.price.toFixed(2)} × 
                    <input
                      type="number"
                      min="1"
                      max={allowNegativeInventory ? undefined : item.available}
                      value={item.quantity}
                      placeholder="Qty"
                      onChange={(e) =>
                        updateQuantity(item.id, parseInt(e.target.value) || 1)
                      }
                      className="w-12 mx-1 px-1 py-0 border rounded text-center text-xs"
                    />
                    = <span className="font-bold">₵{(item.price * item.quantity).toFixed(2)}</span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="border-t pt-4 space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>₵{getTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-lime-600 dark:text-lime-400">
                ₵{getTotal().toFixed(2)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => {
                // Always start a fresh checkout session; lock state is managed live by CheckoutForm.
                setCloseBlocked(false);
                setShowCheckout(true);
              }}
              className="flex-1 bg-lime-600 hover:bg-lime-700 text-white"
            >
              Checkout
            </Button>
            <Button
              onClick={clearCart}
              variant="outline"
              className="flex-1"
            >
              Clear Cart
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={showCheckout}
        onOpenChange={(open) => {
          if (!open) {
            // Block closing only while the current open checkout is in printed-preview lock state.
            if (closeBlocked) {
              alert("A printed receipt exists for the current preview. Please 'Confirm & Record Sale' before closing.");
              return;
            }
          }

          if (!open) {
            setCloseBlocked(false);
          }

          setShowCheckout(open);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw]">
          <DialogHeader>
            <DialogTitle>Complete Order</DialogTitle>
            <DialogDescription>
              Review the order, complete payment, and print or download the receipt.
            </DialogDescription>
          </DialogHeader>
          <CheckoutForm
            onClose={() => {
              setCloseBlocked(false);
              setShowCheckout(false);
            }}
            onCloseGuardChange={setCloseBlocked}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
