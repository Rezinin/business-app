"use client";

import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { useRef } from "react";

interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ReceiptData {
  receipt_number: string;
  business_name: string;
  business_address?: string;
  business_phone?: string;
  business_tax_id?: string;
  date: string;
  time: string;
  items: ReceiptItem[];
  subtotal: number;
  tax?: number;
  total: number;
  payment_method: string;
  amount_paid: number;
  change?: number;
  customer_name?: string;
  customer_phone?: string;
  salesperson_name: string;
  status: string;
}

interface POSReceiptProps {
  receipt: ReceiptData;
  compact?: boolean;
}

export function POSReceipt({ receipt, compact = false }: POSReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open("", "", "width=400,height=600");
    if (printWindow && receiptRef.current) {
      printWindow.document.write(receiptRef.current.innerHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    if (!receiptRef.current) return;

    const element = receiptRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Convert HTML to image and download
    const html = element.innerHTML;
    const doc = document.createElement("div");
    doc.innerHTML = html;
    doc.style.padding = "20px";

    const printWindow = window.open("", "", "width=400,height=600");
    if (printWindow) {
      printWindow.document.write("<!DOCTYPE html><html><head>");
      printWindow.document.write("<style>");
      printWindow.document.write(`
        body { font-family: monospace; margin: 0; padding: 10px; }
        .receipt { width: 100%; max-width: 400px; }
        .receipt-header { text-align: center; margin-bottom: 10px; }
        .receipt-title { font-size: 16px; font-weight: bold; }
        .receipt-subtitle { font-size: 12px; }
        .receipt-divider { border-top: 1px dashed #000; margin: 10px 0; }
        .receipt-section { margin: 10px 0; }
        .receipt-section-title { font-weight: bold; margin-bottom: 5px; }
        .receipt-item { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
        .receipt-item-name { flex: 1; }
        .receipt-item-qty { width: 30px; text-align: center; }
        .receipt-item-price { width: 60px; text-align: right; }
        .receipt-total-row { display: flex; justify-content: space-between; font-weight: bold; margin: 5px 0; }
        .receipt-footer { text-align: center; margin-top: 10px; font-size: 12px; }
      `);
      printWindow.document.write("</style></head><body>");
      printWindow.document.write(html);
      printWindow.document.write("</body></html>");
      printWindow.document.close();
    }
  };

  return (
    <>
      <div
        ref={receiptRef}
        className={`${compact ? "max-w-xs" : "max-w-sm"} mx-auto bg-white p-6 font-mono text-sm border-2 border-gray-800 rounded`}
        style={{ fontFamily: "monospace", lineHeight: "1.4" }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-lg font-bold">{receipt.business_name}</div>
          {receipt.business_address && (
            <div className="text-xs text-gray-600">{receipt.business_address}</div>
          )}
          {receipt.business_phone && (
            <div className="text-xs text-gray-600">Tel: {receipt.business_phone}</div>
          )}
          {receipt.business_tax_id && (
            <div className="text-xs text-gray-600">Tax ID: {receipt.business_tax_id}</div>
          )}
        </div>

        <div className="border-t-2 border-b-2 border-gray-800 py-2 text-center text-xs">
          <div className="font-bold">SALES RECEIPT</div>
          <div>Receipt #{receipt.receipt_number}</div>
          <div>{receipt.date} {receipt.time}</div>
        </div>

        {/* Items */}
        <div className="my-4">
          <div className="border-t border-gray-400 pt-2 pb-2 text-xs font-bold grid grid-cols-12 gap-1 mb-2">
            <div className="col-span-6">Item</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">Total</div>
          </div>
          {receipt.items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-1 text-xs mb-1">
              <div className="col-span-6 truncate">{item.name}</div>
              <div className="col-span-2 text-right">{item.quantity}</div>
              <div className="col-span-2 text-right">₵{item.unit_price.toFixed(2)}</div>
              <div className="col-span-2 text-right">₵{item.total_price.toFixed(2)}</div>
            </div>
          ))}
          <div className="border-t border-gray-400 pt-2 mt-2" />
        </div>

        {/* Totals */}
        <div className="space-y-1 text-sm mb-4">
          <div className="grid grid-cols-2 gap-4">
            <span>Subtotal:</span>
            <span className="text-right">₵{receipt.subtotal.toFixed(2)}</span>
          </div>
          {receipt.tax && receipt.tax > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <span>Tax:</span>
              <span className="text-right">₵{receipt.tax.toFixed(2)}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 font-bold text-base border-t border-b border-gray-800 py-2">
            <span>TOTAL:</span>
            <span className="text-right">₵{receipt.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="space-y-1 text-xs mb-4 border-t pt-2">
          <div>Payment Method: {receipt.payment_method}</div>
          <div>Amount Paid: ₵{receipt.amount_paid.toFixed(2)}</div>
          {receipt.change !== undefined && receipt.change > 0 && (
            <div className="font-bold">Change: ₵{receipt.change.toFixed(2)}</div>
          )}
          {receipt.status === "pending" && (
            <div className="font-bold text-red-600">STATUS: CREDIT (PENDING PAYMENT)</div>
          )}
        </div>

        {/* Customer & Salesperson Info */}
        {(receipt.customer_name || receipt.salesperson_name) && (
          <div className="text-xs space-y-1 border-t pt-2 mb-4">
            {receipt.customer_name && <div>Customer: {receipt.customer_name}</div>}
            {receipt.customer_phone && <div>Phone: {receipt.customer_phone}</div>}
            <div>Salesperson: {receipt.salesperson_name}</div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs border-t pt-2">
          <div className="mb-2">Thank you for your business!</div>
          <div className="text-gray-500">Please keep this receipt for your records</div>
        </div>
      </div>

      {/* Controls */}
      {!compact && (
        <div className="flex gap-2 mt-4 justify-center">
          <Button onClick={handlePrint} size="sm" variant="outline" className="gap-2">
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button onClick={handleDownload} size="sm" variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      )}
    </>
  );
}
