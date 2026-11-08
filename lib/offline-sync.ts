"use client";

import { recordMultipleSale } from "@/app/actions";
import { buildReceiptDataMultiple } from "@/lib/receipt-utils";
import type { ReceiptDataPayload } from "@/lib/receipt-utils";

export interface OfflineSaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface OfflineSale {
  id: string;
  timestamp: string;
  items: OfflineSaleItem[];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  status: "paid" | "pending";
  amountPaid: number;
  paymentMethod?: string;
  totalPrice: number;
  receiptNumber: string;
  receiptData: ReceiptDataPayload;
  synced: boolean;
  syncError?: string;
}

const STORAGE_KEY = "rezinin_pos_offline_sales_queue";
const QUEUE_EVENT = "rezinin_offline_queue_updated";

/**
 * Check if the browser currently reports online status
 */
export function isDeviceOnline(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return true;
  }
  return navigator.onLine;
}

/**
 * Retrieve all pending offline sales from localStorage
 */
export function getOfflineSales(): OfflineSale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to parse offline sales queue:", error);
    return [];
  }
}

/**
 * Save pending offline sales queue to localStorage and notify listeners
 */
function setOfflineSales(sales: OfflineSale[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
    window.dispatchEvent(new CustomEvent(QUEUE_EVENT, { detail: sales }));
  } catch (error) {
    console.error("Failed to persist offline sales queue:", error);
  }
}

/**
 * Enqueue a new offline sale and generate an immediate local receipt
 */
export function saveOfflineSale(params: {
  items: OfflineSaleItem[];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  status: "paid" | "pending";
  amountPaid: number;
  paymentMethod?: string;
  cashierName?: string;
}): { sale: OfflineSale; receipt: ReceiptDataPayload } {
  const queue = getOfflineSales();
  const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const totalPrice = params.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Generate an offline receipt immediately
  const receiptData = buildReceiptDataMultiple(
    params.items.map((i) => ({
      name: i.productName,
      price: i.price,
      quantity: i.quantity,
    })),
    params.customerName || "Walk-in Customer",
    params.customerPhone || "",
    params.cashierName || "Cashier (Offline)",
    params.amountPaid,
    params.status,
    params.paymentMethod
  );

  // Mark receipt as offline generated so customer/staff knows it was captured locally
  receiptData.receipt_number = `OFFLINE-${receiptData.receipt_number}`;

  const newSale: OfflineSale = {
    id,
    timestamp: now,
    items: params.items,
    customerId: params.customerId,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    status: params.status,
    amountPaid: params.amountPaid,
    paymentMethod: params.paymentMethod,
    totalPrice,
    receiptNumber: receiptData.receipt_number,
    receiptData,
    synced: false,
  };

  queue.push(newSale);
  setOfflineSales(queue);

  return { sale: newSale, receipt: receiptData };
}

/**
 * Remove a sale from the offline queue (e.g., after successful sync)
 */
export function removeOfflineSale(id: string) {
  const queue = getOfflineSales();
  const filtered = queue.filter((sale) => sale.id !== id);
  setOfflineSales(filtered);
}

/**
 * Mark an offline sale as having encountered an error during sync
 */
export function markOfflineSaleFailed(id: string, errorMessage: string) {
  const queue = getOfflineSales();
  const updated = queue.map((sale) => {
    if (sale.id === id) {
      return { ...sale, syncError: errorMessage };
    }
    return sale;
  });
  setOfflineSales(updated);
}

/**
 * Synchronize a single offline sale to the Supabase backend
 */
export async function syncSingleOfflineSale(sale: OfflineSale): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await recordMultipleSale({
      items: sale.items,
      customerId: sale.customerId,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      status: sale.status,
      amountPaid: sale.amountPaid,
      paymentMethod: sale.paymentMethod,
    });

    if (result && result.sale) {
      removeOfflineSale(sale.id);
      return { success: true };
    }
    return { success: false, error: "Server returned no sale confirmation" };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Network error syncing sale";
    markOfflineSaleFailed(sale.id, msg);
    return { success: false, error: msg };
  }
}

/**
 * Synchronize all queued offline sales sequentially
 */
export async function syncAllOfflineSales(): Promise<{
  successCount: number;
  failedCount: number;
  errors: string[];
}> {
  const sales = getOfflineSales();
  if (sales.length === 0) {
    return { successCount: 0, failedCount: 0, errors: [] };
  }

  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const sale of sales) {
    const res = await syncSingleOfflineSale(sale);
    if (res.success) {
      successCount++;
    } else {
      failedCount++;
      if (res.error) errors.push(res.error);
    }
  }

  return { successCount, failedCount, errors };
}

/**
 * Listen for offline queue changes across components and browser tabs
 */
export function subscribeToOfflineQueue(callback: (queue: OfflineSale[]) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<OfflineSale[]>;
    callback(customEvent.detail || getOfflineSales());
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getOfflineSales());
    }
  };

  window.addEventListener(QUEUE_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(QUEUE_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
