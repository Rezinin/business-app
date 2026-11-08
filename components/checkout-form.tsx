"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { recordMultipleSale } from "@/app/actions";
import { POSReceipt } from "./pos-receipt";
import { ReceiptDataPayload, BUSINESS_CONFIG } from "@/lib/receipt-utils";
import { isDeviceOnline, saveOfflineSale } from "@/lib/offline-sync";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface CheckoutFormProps {
  onClose: () => void;
}

export function CheckoutForm({ onClose }: CheckoutFormProps) {
  const { items, getTotal, clearCart } = useCart();
  const router = useRouter();
  const [status, setStatus] = useState<"paid" | "pending">("paid");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [otherPaymentLabel, setOtherPaymentLabel] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [amountPaid, setAmountPaid] = useState(getTotal().toString());
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptDataPayload | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [saleConfirmed, setSaleConfirmed] = useState(false);
  const [salespersonName, setSalespersonName] = useState<string>("Current User");
  const supabase = createClient();
  const submittingRef = useRef(false);

  const total = getTotal();
  const parsedAmountPaid = Number.isFinite(Number(amountPaid)) ? Number(amountPaid) : 0;
  const change = Math.max(0, parsedAmountPaid - total);
  const derivedStatus: "paid" | "pending" = parsedAmountPaid >= total ? "paid" : "pending";

  useEffect(() => {
    if (status !== derivedStatus) {
      setStatus(derivedStatus);
    }
  }, [derivedStatus, status]);

  // Load all customers from the database for fast lookup
  useEffect(() => {
    const loadCustomers = async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone")
        .order("name", { ascending: true });

      if (error) {
        console.error("Failed to load customers:", error);
        return;
      }

      setCustomers((data as Customer[]) || []);
    };

    loadCustomers();
  }, [supabase]);

  // Load current authenticated user's profile to get the full name for receipts
  useEffect(() => {
    const loadSalesperson = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();

          if (!error && profile?.full_name) {
            setSalespersonName(profile.full_name);
          } else if (user.email) {
            setSalespersonName(user.email.split("@")[0]);
          }
        }
      } catch {
        // keep existing salespersonName
      }
    };

    loadSalesperson();
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
      const receiptNumber = `PREVIEW-${Date.now()}`;
      let finalSalespersonName = salespersonName;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();
          if (profile?.full_name) finalSalespersonName = profile.full_name;
          else if (user.email) finalSalespersonName = user.email.split("@")[0];
        }
      } catch {
        // keep existing salespersonName
      }

      const receiptInfo = {
        receipt_number: receiptNumber,
        business_name: BUSINESS_CONFIG.name,
        business_address: BUSINESS_CONFIG.address,
        business_phone: BUSINESS_CONFIG.phone,
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
        payment_method: paymentMethod === "Other" ? (otherPaymentLabel || "Other") : paymentMethod,
        amount_paid: parsedAmountPaid,
        change: derivedStatus === "paid" ? change : undefined,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        salesperson_name: finalSalespersonName || "Unknown",
        status: derivedStatus,
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
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);

    const saleItems = items.map((item) => ({
      productId: item.id,
      productName: item.name,
      quantity: item.quantity,
      price: item.price,
    }));
    const resolvedCustomer = customerName || "Walk-in Customer";
    const resolvedMethod = paymentMethod === "Other" ? (otherPaymentLabel || "Other") : paymentMethod;

    // Fast-path: If the device is detected offline, save to local queue immediately
    if (!isDeviceOnline()) {
      const offlineResult = saveOfflineSale({
        items: saleItems,
        customerId: selectedCustomerId || undefined,
        customerName: resolvedCustomer,
        customerPhone,
        status: derivedStatus,
        amountPaid: parsedAmountPaid,
        paymentMethod: resolvedMethod,
      });

      setReceiptData(offlineResult.receipt);
      setSaleConfirmed(true);
      clearCart();
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    try {
      const response = await recordMultipleSale({
        items: saleItems,
        customerId: selectedCustomerId || undefined,
        customerName: resolvedCustomer,
        customerPhone,
        status: derivedStatus,
        amountPaid: parsedAmountPaid,
        paymentMethod: resolvedMethod,
      });

      if (response.receipt?.receipt_data) {
        setReceiptData(response.receipt.receipt_data);
        setSaleConfirmed(true);
        // Clear active cart immediately upon confirmation so no duplicates can ever occur
        clearCart();
        router.refresh();
      }
    } catch (error: unknown) {
      console.warn("Server confirmation failed; saving to offline queue:", error);
      // Auto-fallback: If network drops mid-flight, do NOT lose the sale! Save locally.
      const offlineResult = saveOfflineSale({
        items: saleItems,
        customerId: selectedCustomerId || undefined,
        customerName: resolvedCustomer,
        customerPhone,
        status: derivedStatus,
        amountPaid: parsedAmountPaid,
        paymentMethod: resolvedMethod,
      });

      setReceiptData(offlineResult.receipt);
      setSaleConfirmed(true);
      clearCart();
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  // Show receipt preview or final confirmation
  if (receiptData && previewMode) {
    if (saleConfirmed) {
      const isOfflineReceipt = receiptData.receipt_number?.startsWith("OFFLINE-");
      return (
        <div className="space-y-4">
          {isOfflineReceipt ? (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg p-3 text-amber-900 dark:text-amber-200 text-sm font-medium">
              ⚡ <strong>Saved Locally in Offline Mode</strong>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Receipt is ready for your customer. The sale will auto-sync to the cloud once network connectivity is restored.
              </p>
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-green-800 dark:text-green-200 text-sm font-medium">
              ✓ Sale successfully recorded
            </div>
          )}
          <POSReceipt receipt={receiptData} compact={false} />
          <Button
            onClick={() => {
              clearCart();
              onClose();
            }}
            className="w-full bg-lime-600 hover:bg-lime-700 font-semibold"
          >
            Close & Start New Order
          </Button>
        </div>
      );
    } else {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-blue-800 dark:text-blue-200 text-sm">
            ℹ️ Review order details. You can print or download the receipt or confirm the sale below.
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
              className="flex-1 bg-lime-600 hover:bg-lime-700 text-white font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : "Confirm & Record Sale"}
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
          <Select 
            value={status} 
            onValueChange={(v) => {
              setStatus(v as "paid" | "pending");
              if (v === "pending") {
                setAmountPaid("0");
              } else {
                setAmountPaid(total.toString());
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending (Credit Sale)</SelectItem>
            </SelectContent>
          </Select>
            <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
              {status === "pending" 
                ? "Amount paid set to 0. Caution: If this is a partial payment, please input the actual amount paid below." 
                : "This will automatically switch based on the amount paid."}
            </p>
        </div>

        <div>
          <Label htmlFor="paymentMethod">Payment Method</Label>
          <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v)}>
            <SelectTrigger id="paymentMethod">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Mobile Money">Mobile Money</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          {paymentMethod === "Other" && (
            <div className="mt-2">
              <Label htmlFor="otherPayment">Specify Payment Method</Label>
              <Input id="otherPayment" value={otherPaymentLabel} onChange={(e) => setOtherPaymentLabel(e.target.value)} placeholder="e.g., Voucher, Card" />
            </div>
          )}
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

        {derivedStatus === "paid" && (
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
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Preview...
          </>
        ) : "Preview Order"}
      </Button>
    </div>
  );
}
