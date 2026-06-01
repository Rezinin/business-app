// Utility functions for POS receipt generation

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ReceiptDataPayload {
  receipt_number: string;
  business_name: string;
  business_address?: string;
  business_phone?: string;
  business_logo?: string;
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

/**
 * Generate a unique receipt number
 * Format: REC-YYYYMMDD-XXXXX (timestamp based)
 */
export function generateReceiptNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const timestamp = now.getTime();
  const random = Math.floor(Math.random() * 10000);
  return `REC-${year}${month}${day}-${String(timestamp).slice(-5)}${String(random).padStart(4, "0")}`;
}

/**
 * Format date and time for receipt
 */
export function formatReceiptDateTime(): { date: string; time: string } {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return { date, time };
}

/**
 * Build receipt data object
 */
export function buildReceiptData(
  productName: string,
  productPrice: number,
  quantity: number,
  customerId: string | undefined,
  customerName: string | undefined,
  customerPhone: string | undefined,
  salespersonName: string,
  amountPaid: number,
  status: string,
  paymentMethod?: string,
  businessLogo?: string
): ReceiptDataPayload {
  const unitPrice = productPrice;
  const subtotal = productPrice * quantity;
  const total = subtotal;
  const change = amountPaid > total ? amountPaid - total : 0;
  const resolvedPaymentMethod = paymentMethod || (status === "pending" ? "Credit" : "Cash");

  const { date, time } = formatReceiptDateTime();

  return {
    receipt_number: generateReceiptNumber(),
    business_name: "Rezinin Enterprise",
    business_address: "Ghana",
    business_phone: "+233 24 995 7751",
    date,
    time,
    items: [
      {
        name: productName,
        quantity,
        unit_price: unitPrice,
        total_price: subtotal,
      },
    ],
    subtotal,
    tax: undefined, // Add tax calculation if needed
    total,
    payment_method: resolvedPaymentMethod,
    amount_paid: amountPaid,
    change: change > 0 ? change : undefined,
    customer_name: customerName,
    customer_phone: customerPhone,
    salesperson_name: salespersonName,
    business_logo: businessLogo,
    status,
  };
}

/**
 * Build receipt data object for multiple items
 */
export function buildReceiptDataMultiple(
  items: Array<{ name: string; price: number; quantity: number }>,
  customerName: string | undefined,
  customerPhone: string | undefined,
  salespersonName: string,
  amountPaid: number,
  status: string,
  paymentMethod?: string,
  businessLogo?: string
): ReceiptDataPayload {
  const receiptItems: ReceiptItem[] = items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unit_price: item.price,
    total_price: item.price * item.quantity,
  }));

  const subtotal = receiptItems.reduce((sum, item) => sum + item.total_price, 0);
  const total = subtotal;
  const change = amountPaid > total ? amountPaid - total : 0;
  const resolvedPaymentMethod = paymentMethod || (status === "pending" ? "Credit" : "Cash");

  const { date, time } = formatReceiptDateTime();

  return {
    receipt_number: generateReceiptNumber(),
    business_name: "Rezinin Enterprise",
    business_address: "Ghana",
    business_phone: "+233 XXX XXX XXXX",
    date,
    time,
    items: receiptItems,
    subtotal,
    tax: undefined, // Add tax calculation if needed
    total,
    payment_method: resolvedPaymentMethod,
    amount_paid: amountPaid,
    change: change > 0 ? change : undefined,
    customer_name: customerName,
    customer_phone: customerPhone,
    salesperson_name: salespersonName,
    business_logo: businessLogo,
    status,
  };
}
