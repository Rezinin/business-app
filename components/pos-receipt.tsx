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
  const itemsHtml = receipt.items
    .map(
      (item) => `
        <tr>
          <td class="item-name">${escapeHtml(item.name)}</td>
          <td class="item-center">${item.quantity}</td>
          <td class="item-right">₵${item.unit_price.toFixed(2)}</td>
          <td class="item-right">₵${item.total_price.toFixed(2)}</td>
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
          :root {
            color-scheme: light;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 16px;
            background: #ffffff;
            color: #0f172a;
            font-family: "Courier New", Courier, monospace;
          }
          .sheet {
            width: 100%;
            max-width: 360px;
            margin: 0 auto;
            border: 2px solid #111827;
            border-radius: 10px;
            padding: 18px;
            background: #ffffff;
          }
          .title {
            text-align: center;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 6px;
          }
          .subtle {
            text-align: center;
            font-size: 12px;
            line-height: 1.5;
            color: #334155;
          }
          .divider {
            border-top: 2px solid #111827;
            border-bottom: 2px solid #111827;
            padding: 8px 0;
            margin: 14px 0;
            text-align: center;
            font-size: 12px;
          }
          .section {
            margin: 12px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th, td {
            padding: 4px 0;
            vertical-align: top;
          }
          th {
            border-top: 1px solid #cbd5e1;
            border-bottom: 1px solid #cbd5e1;
            text-align: left;
            font-weight: 700;
            padding-top: 8px;
            padding-bottom: 8px;
          }
          .item-name { width: 54%; }
          .item-center { width: 12%; text-align: center; }
          .item-right { width: 17%; text-align: right; }
          .row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin: 4px 0;
            font-size: 13px;
          }
          .row strong {
            font-size: 15px;
          }
          .totals {
            border-top: 1px solid #cbd5e1;
            border-bottom: 1px solid #111827;
            padding: 10px 0;
            margin-top: 8px;
          }
          .footer {
            margin-top: 14px;
            text-align: center;
            font-size: 12px;
            color: #334155;
          }
          .status {
            color: #b91c1c;
            font-weight: 700;
          }
          @media print {
            body {
              padding: 0;
            }
            .sheet {
              border: 0;
              border-radius: 0;
              max-width: none;
            }
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
            <div>Receipt #${escapeHtml(receipt.receipt_number)}</div>
            <div>${escapeHtml(receipt.date)} ${escapeHtml(receipt.time)}</div>
          </div>

          <div class="section">
            <table>
              <thead>
                <tr>
                  <th class="item-name">Item</th>
                  <th class="item-center">Qty</th>
                  <th class="item-right">Price</th>
                  <th class="item-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <div class="section totals">
            <div class="row"><span>Subtotal</span><span>₵${receipt.subtotal.toFixed(2)}</span></div>
            ${receipt.tax && receipt.tax > 0 ? `<div class="row"><span>Tax</span><span>₵${receipt.tax.toFixed(2)}</span></div>` : ""}
            <div class="row"><strong>TOTAL</strong><strong>₵${receipt.total.toFixed(2)}</strong></div>
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

export function POSReceipt({ receipt, compact = false }: POSReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [printed, setPrinted] = useState(false);

  const handlePrint = () => {
    const printWindow = window.open("", "", "width=400,height=600");
    if (printWindow) {
      printWindow.document.write(buildPrintableReceiptHtml(receipt));
      printWindow.document.close();
      printWindow.print();
      setPrinted(true);
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
    }
  };

  return (
    <>
      <div
        ref={receiptRef}
        className={`${compact ? "max-w-xs" : "max-w-sm"} mx-auto bg-white p-6 font-mono text-sm text-slate-900 border-2 border-slate-800 rounded shadow-sm print:text-slate-900 print:bg-white`}
      >
        {/* Header */}
        <div className="text-center mb-4 text-slate-900">
          <div className="text-lg font-bold">{receipt.business_name}</div>
          {receipt.business_address && (
            <div className="text-xs text-slate-700">{receipt.business_address}</div>
          )}
          {receipt.business_phone && (
            <div className="text-xs text-slate-700">Tel: {receipt.business_phone}</div>
          )}
        </div>

        <div className="border-t-2 border-b-2 border-slate-800 py-2 text-center text-xs text-slate-900">
          <div className="font-bold">SALES RECEIPT</div>
          <div>Receipt #{receipt.receipt_number}</div>
          <div>{receipt.date} {receipt.time}</div>
        </div>

        {/* Items */}
        <div className="my-4 text-slate-900">
          <div className="border-t border-slate-300 pt-2 pb-2 text-xs font-bold grid grid-cols-12 gap-1 mb-2">
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
          <div className="border-t border-slate-300 pt-2 mt-2" />
        </div>

        {/* Totals */}
        <div className="space-y-1 text-sm mb-4 text-slate-900">
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
          <div className="grid grid-cols-2 gap-4 font-bold text-base border-t border-b border-slate-800 py-2">
            <span>TOTAL:</span>
            <span className="text-right">₵{receipt.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="space-y-1 text-xs mb-4 border-t border-slate-200 pt-2 text-slate-900">
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
          <div className="text-xs space-y-1 border-t border-slate-200 pt-2 mb-4 text-slate-900">
            {receipt.customer_name && <div>Customer: {receipt.customer_name}</div>}
            {receipt.customer_phone && <div>Phone: {receipt.customer_phone}</div>}
            <div>Salesperson: {receipt.salesperson_name}</div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs border-t border-slate-200 pt-2 text-slate-900">
          <div className="mb-2">Thank you for your business!</div>
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
