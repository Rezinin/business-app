"use client";

import { useEffect, useState } from "react";
import { useCart, CartItem } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { recordMultipleSale } from "@/app/actions";
import { POSReceipt } from "./pos-receipt";
import { ReceiptDataPayload } from "@/lib/receipt-utils";
import { createClient } from "@/lib/supabase/client";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

export function CheckoutForm({ onClose }: { onClose: () => void }) {
  const { items, getTotal, clearCart } = useCart();
  const [status, setStatus] = useState<"paid" | "pending">("paid");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [amountPaid, setAmountPaid] = useState(getTotal().toString());
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptDataPayload | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [saleConfirmed, setSaleConfirmed] = useState(false);
  const supabase = createClient();

  const total = getTotal();
  const change = Math.max(0, parseFloat(amountPaid) - total);

  useEffect(() => {
    const loadCustomers = async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone")
        .order("name");

      if (error) {
        console.error("Failed to load customers:", error);
        return;
      }

      setCustomers(data || []);
    };

    loadCustomers();
  }, [supabase]);

  useEffect(() => {
    if (!selectedCustomerId) return;

    const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
    if (selectedCustomer) {
      setCustomerName(selectedCustomer.name);
      setCustomerPhone(selectedCustomer.phone || "");
    }
  }, [customers, selectedCustomerId]);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Import buildReceiptDataMultiple and buildReceipt from actions
      // For preview, we'll generate the receipt data locally without recording
      const salespersonName = "Current User"; // Will be fetched if needed
      
      // Build receipt data for preview
      const receiptInfo = {
        receipt_number: `PREVIEW-${Date.now()}`,
        business_name: "Rezinin Enterprise",
        business_address: "Adenta, Accra",
        business_phone: "+233 XX XXX XXXX",
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
        })),
        subtotal: total,
        tax: 0,
        total: total,
        payment_method: status === "paid" ? "Cash" : "Credit",
        amount_paid: parseFloat(amountPaid),
        change: status === "paid" ? change : undefined,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        salesperson_name: salespersonName,
        status: status,
      };
      
      setReceiptData(receiptInfo);
      setPreviewMode(true);
    } catch (error) {
      console.error("Preview error:", error);
      alert("Error generating receipt preview. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSale = async () => {
    setLoading(true);
    try {
      const response = await recordMultipleSale({
        items: items.map((item) => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        customerId: selectedCustomerId || undefined,
        customerName: customerName || "Walk-in Customer",
        customerPhone,
        status,
        amountPaid: parseFloat(amountPaid),
      });

      if (response.receipt?.receipt_data) {
        setReceiptData(response.receipt.receipt_data);
        setSaleConfirmed(true);
      }
    } catch (error) {
      console.error("Confirmation error:", error);
      alert("Error confirming sale. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show receipt preview or final confirmation
  if (receiptData && previewMode) {
    if (saleConfirmed) {
      // Sale has been confirmed and recorded
      return (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-green-800 dark:text-green-200 text-sm">
            ✓ Sale successfully recorded
          </div>
          <POSReceipt receipt={receiptData} compact={false} />
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
    } else {
      // Preview mode - not yet confirmed
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-blue-800 dark:text-blue-200 text-sm">
            ℹ️ Review the receipt below. You can print or save it before confirming the sale.
          </div>
          <POSReceipt receipt={receiptData} compact={false} />
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setPreviewMode(false);
                setReceiptData(null);
              }}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Back & Edit
            </Button>
            <Button
              onClick={handleConfirmSale}
              disabled={loading}
              className="flex-1 bg-lime-600 hover:bg-lime-700 text-white"
            >
              {loading ? "Confirming..." : "Confirm & Record Sale"}
            </Button>
          </div>
        </div>
      );
    }
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
          <Label htmlFor="customerSelect">Existing Customer</Label>
          <Select
            value={selectedCustomerId}
            onValueChange={(value) => {
              setSelectedCustomerId(value);
            }}
          >
            <SelectTrigger id="customerSelect">
              <SelectValue placeholder="Select an existing customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="customerName">Customer Name</Label>
          <Input
            id="customerName"
            placeholder="Leave blank for walk-in customer"
            value={customerName}
            onChange={(e) => {
              setSelectedCustomerId("");
              setCustomerName(e.target.value);
            }}
          />
        </div>

        <div>
          <Label htmlFor="customerPhone">Phone (Optional)</Label>
          <Input
            id="customerPhone"
            placeholder="Customer phone number"
            value={customerPhone}
            onChange={(e) => {
              setSelectedCustomerId("");
              setCustomerPhone(e.target.value);
            }}
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
        {loading ? "Generating Preview..." : "Preview Order"}
      </Button>
    </div>
  );
}
