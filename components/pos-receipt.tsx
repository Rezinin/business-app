"use client";

import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { useRef, useState } from "react";

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
  onPrinted?: () => void;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPrintableReceiptHtml(receipt: ReceiptData) {
  const cleanedReceiptNumber = receipt.receipt_number.replace(/^PREVIEW-?/i, "");
  const itemsHtml = receipt.items
    .map(
      (item) => `
        <tr>
          <td class="item-name">${escapeHtml(item.name)}</td>
          <td class="item-qty">${item.quantity}</td>
          <td class="item-price">₵${item.unit_price.toFixed(2)}</td>
          <td class="item-total">₵${item.total_price.toFixed(2)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Receipt ${escapeHtml(receipt.receipt_number)}</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 6px 8px;
            background: #ffffff;
            color: #000000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 12px;
          }
          /* Narrow receipt width for thermal printers */
          .sheet {
            width: 100%;
            max-width: 320px;
            margin: 0 auto;
            padding: 6px 8px;
          }
          .title { text-align: center; font-size: 16px; font-weight: 800; margin-bottom: 2px; }
          .subtle { text-align: center; font-size: 11px; line-height: 1.3; color: #222222; }
          .divider { border-top: 1px dashed #222; margin: 8px 0; padding-top: 6px; padding-bottom: 6px; text-align: left; }
          .section { margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { padding: 2px 0; vertical-align: top; }
          thead th { font-weight: 700; text-align: left; padding-top: 4px; padding-bottom: 4px; }
          .item-name { width: 60%; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .item-qty { width: 8%; text-align: center; }
          .item-price { width: 16%; text-align: right; }
          .item-total { width: 16%; text-align: right; }
          .row { display:flex; justify-content:space-between; gap:8px; font-size:13px; }
          .totals { border-top: 1px solid #222; padding-top: 6px; margin-top: 6px; }
          .totals .label { font-size: 12px; }
          .totals .value { font-size: 12px; text-align: right; }
          .grand { font-weight: 900; font-size: 16px; }
          .footer { margin-top: 8px; text-align: center; font-size: 11px; color: #222; }
          .status { color: #b91c1c; font-weight: 700; }
          @media print {
            body { padding: 0; }
            .sheet { max-width: 320px; }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="title">${escapeHtml(receipt.business_name)}</div>
          ${receipt.business_address ? `<div class="subtle">${escapeHtml(receipt.business_address)}</div>` : ""}
          ${receipt.business_phone ? `<div class="subtle">Tel: ${escapeHtml(receipt.business_phone)}</div>` : ""}

          <div class="divider">
            <div><strong>SALES RECEIPT</strong></div>
            <div>Receipt #${escapeHtml(cleanedReceiptNumber)}</div>
            <div>${escapeHtml(receipt.date)} ${escapeHtml(receipt.time)}</div>
          </div>

          <div class="section">
            <table>
              <thead>
                <tr>
                  <th class="item-name">Item</th>
                  <th class="item-qty">Qty</th>
                  <th class="item-price">Price</th>
                  <th class="item-total">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <div class="section totals">
            <div class="row"><span class="label">Subtotal</span><span class="value">₵${receipt.subtotal.toFixed(2)}</span></div>
            ${receipt.tax && receipt.tax > 0 ? `<div class="row"><span class="label">Tax</span><span class="value">₵${receipt.tax.toFixed(2)}</span></div>` : ""}
            <div class="row totals"><span class="label grand">TOTAL</span><span class="value grand">₵${receipt.total.toFixed(2)}</span></div>
          </div>

          <div class="section">
            <div class="row"><span>Payment Method</span><span>${escapeHtml(receipt.payment_method)}</span></div>
            <div class="row"><span>Amount Paid</span><span>₵${receipt.amount_paid.toFixed(2)}</span></div>
            ${receipt.change !== undefined && receipt.change > 0 ? `<div class="row"><strong>Change</strong><strong>₵${receipt.change.toFixed(2)}</strong></div>` : ""}
            ${receipt.status === "pending" ? `<div class="row status"><span>STATUS</span><span>CREDIT (PENDING PAYMENT)</span></div>` : ""}
          </div>

          ${(receipt.customer_name || receipt.salesperson_name) ? `
            <div class="section">
              ${receipt.customer_name ? `<div class="row"><span>Customer</span><span>${escapeHtml(receipt.customer_name)}</span></div>` : ""}
              ${receipt.customer_phone ? `<div class="row"><span>Phone</span><span>${escapeHtml(receipt.customer_phone)}</span></div>` : ""}
              <div class="row"><span>Salesperson</span><span>${escapeHtml(receipt.salesperson_name)}</span></div>
            </div>
          ` : ""}

          <div class="footer">
            <div>Thank you for your business!</div>
            <div>Please keep this receipt for your records</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function POSReceipt({ receipt, compact = false, onPrinted }: POSReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [printed, setPrinted] = useState(false);

  const handlePrint = () => {
    const printWindow = window.open("", "", "width=400,height=600");
    if (printWindow) {
      printWindow.document.write(buildPrintableReceiptHtml(receipt));
      printWindow.document.close();
      printWindow.print();
      setPrinted(true);
      if (typeof onPrinted === "function") onPrinted();
    }
  };

  const handleDownload = () => {
    const printWindow = window.open("", "", "width=400,height=600");
    if (printWindow) {
      printWindow.document.write(buildPrintableReceiptHtml(receipt));
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      setPrinted(true);
      if (typeof onPrinted === "function") onPrinted();
    }
  };

  return (
    <>
      <div
        ref={receiptRef}
        className="w-full max-w-2xl mx-auto bg-white p-4 font-mono text-slate-900 border-2 border-slate-800 rounded shadow-sm print:text-slate-900 print:bg-white"
      >
        {/* Header */}
        <div className="text-center mb-3 text-slate-900">
          <div className="text-base font-bold">{receipt.business_name}</div>
          {receipt.business_address && (
            <div className="text-sm text-slate-700">{receipt.business_address}</div>
          )}
          {receipt.business_phone && (
            <div className="text-sm text-slate-700">Tel: {receipt.business_phone}</div>
          )}
        </div>

        <div className="border-t-2 border-b-2 border-slate-800 py-2 text-center text-sm text-slate-900">
          <div className="font-bold">SALES RECEIPT</div>
          <div>Receipt #{receipt.receipt_number}</div>
          <div>{receipt.date} {receipt.time}</div>
        </div>

        {/* Items */}
        <div className="my-3 text-slate-900">
          <div className="border-t border-slate-300 pt-1 pb-1 text-sm font-bold grid grid-cols-12 gap-0 mb-1">
            <div className="col-span-6">Item</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">Total</div>
          </div>
          {receipt.items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-0 text-sm mb-1">
              <div className="col-span-6 truncate">{item.name}</div>
              <div className="col-span-2 text-center">{item.quantity}</div>
              <div className="col-span-2 text-right">₵{item.unit_price.toFixed(2)}</div>
              <div className="col-span-2 text-right">₵{item.total_price.toFixed(2)}</div>
            </div>
          ))}
          <div className="border-t border-slate-300 pt-1 mt-1" />
        </div>

        {/* Totals */}
        <div className="space-y-1 mb-3 text-slate-900">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span>Subtotal:</span>
            <span className="text-right">₵{receipt.subtotal.toFixed(2)}</span>
          </div>
          {receipt.tax && receipt.tax > 0 && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span>Tax:</span>
              <span className="text-right">₵{receipt.tax.toFixed(2)}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 font-bold text-base border-t border-b border-slate-800 py-1">
            <span>TOTAL:</span>
            <span className="text-right">₵{receipt.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="space-y-1 mb-3 border-t border-slate-200 pt-1 text-sm text-slate-900">
          <div>Payment Method: {receipt.payment_method}</div>
          <div>Amount Paid: ₵{receipt.amount_paid.toFixed(2)}</div>
          {receipt.change !== undefined && receipt.change > 0 && (
            <div className="font-bold">Change: ₵{receipt.change.toFixed(2)}</div>
          )}
          {receipt.status === "pending" && (
            <div className="font-bold text-red-700">STATUS: CREDIT (PENDING PAYMENT)</div>
          )}
        </div>

        {/* Customer & Salesperson Info */}
        {(receipt.customer_name || receipt.salesperson_name) && (
          <div className="text-sm space-y-1 border-t border-slate-200 pt-1 mb-3 text-slate-900">
            {receipt.customer_name && <div>Customer: {receipt.customer_name}</div>}
            {receipt.customer_phone && <div>Phone: {receipt.customer_phone}</div>}
            <div>Salesperson: {receipt.salesperson_name}</div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm border-t border-slate-200 pt-1 text-slate-900">
          <div className="mb-1">Thank you for your business!</div>
          <div className="text-slate-600">Please keep this receipt for your records</div>
        </div>
      </div>

      {/* Controls */}
      {!compact && (
        <div className="flex flex-col items-center gap-2 mt-4">
          <div className="flex gap-2">
            <Button onClick={handlePrint} size="sm" variant="outline" className="gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button onClick={handleDownload} size="sm" variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
          {printed && (
            <div className="text-sm text-green-600 mt-2">Receipt printed/saved successfully.</div>
          )}
        </div>
      )}
    </>
  );
}
