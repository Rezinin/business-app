"use client";

import { useState } from "react";
import { useCart, CartItem } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { recordMultipleSale } from "@/app/actions";
import { POSReceipt } from "./pos-receipt";
import { ReceiptDataPayload } from "@/lib/receipt-utils";

export function CheckoutForm({ onClose }: { onClose: () => void }) {
  const { items, getTotal, clearCart } = useCart();
  const [status, setStatus] = useState<"paid" | "pending">("paid");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [amountPaid, setAmountPaid] = useState(getTotal().toString());
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptDataPayload | null>(null);

  const total = getTotal();
  const change = Math.max(0, parseFloat(amountPaid) - total);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await recordMultipleSale({
        items: items.map((item) => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        customerName: customerName || "Walk-in Customer",
        customerPhone,
        status,
        amountPaid: parseFloat(amountPaid),
      });

      if (response.receipt?.receipt_data) {
        setReceiptData(response.receipt.receipt_data);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Error processing order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show receipt preview
  if (receiptData) {
    return (
      <div className="space-y-4">
        <POSReceipt receipt={receiptData} compact={true} />
        <Button
          onClick={() => {
            clearCart();
            onClose();
          }}
          className="w-full bg-lime-600 hover:bg-lime-700"
        >
          Close & New Order
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Order Summary */}
      <div className="bg-muted p-4 rounded-lg space-y-2">
        <h4 className="font-semibold text-sm">Order Summary</h4>
        <div className="space-y-1 text-sm">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>₵{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t pt-2 flex justify-between font-bold">
          <span>Total:</span>
          <span>₵{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="customerName">Customer Name</Label>
          <Input
            id="customerName"
            placeholder="Leave blank for walk-in customer"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="customerPhone">Phone (Optional)</Label>
          <Input
            id="customerPhone"
            placeholder="Customer phone number"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>
      </div>

      {/* Payment Info */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="status">Payment Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as "paid" | "pending")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending (Credit Sale)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="amountPaid">Amount Paid</Label>
          <Input
            id="amountPaid"
            type="number"
            step="0.01"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
          />
        </div>

        {status === "paid" && (
          <div className="text-sm p-2 bg-lime-50 dark:bg-lime-900/20 rounded text-lime-900 dark:text-lime-400">
            Change: ₵{change.toFixed(2)}
          </div>
        )}
      </div>

      {/* Checkout Button */}
      <Button
        onClick={handleCheckout}
        disabled={loading || items.length === 0}
        className="w-full bg-lime-600 hover:bg-lime-700 text-white"
      >
        {loading ? "Processing..." : "Complete Order"}
      </Button>
    </div>
  );
}
