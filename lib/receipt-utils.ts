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
  previous_balance?: number;
  remaining_balance?: number;
  receipt_type?: "sale" | "debt_payment";
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

export const BUSINESS_CONFIG = {
  name: "Rezinin Enterprise",
  address: "Peace Star Hotel, Wa, Ghana",
  phone: "+233 24 995 7751",
};

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
    business_name: BUSINESS_CONFIG.name,
    business_address: BUSINESS_CONFIG.address,
    business_phone: BUSINESS_CONFIG.phone,
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
    tax: undefined,
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
    business_name: BUSINESS_CONFIG.name,
    business_address: BUSINESS_CONFIG.address,
    business_phone: BUSINESS_CONFIG.phone,
    date,
    time,
    items: receiptItems,
    subtotal,
    tax: undefined,
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
 * Build receipt data for debt payments
 */
export function buildDebtPaymentReceiptData(
  customerName: string,
  customerPhone: string | undefined,
  amountPaid: number,
  previousBalance: number,
  remainingBalance: number,
  salespersonName: string,
  paymentMethod: string = "Cash"
): ReceiptDataPayload {
  const { date, time } = formatReceiptDateTime();
  const paymentItemName =
    remainingBalance <= 0
      ? `Debt Clearance (Full Settlement)`
      : `Debt Repayment`;

  return {
    receipt_number: generateReceiptNumber().replace("REC-", "REC-PAY-"),
    receipt_type: "debt_payment",
    business_name: BUSINESS_CONFIG.name,
    business_address: BUSINESS_CONFIG.address,
    business_phone: BUSINESS_CONFIG.phone,
    date,
    time,
    items: [
      {
        name: paymentItemName,
        quantity: 1,
        unit_price: amountPaid,
        total_price: amountPaid,
      },
    ],
    subtotal: amountPaid,
    total: amountPaid,
    payment_method: paymentMethod,
    amount_paid: amountPaid,
    customer_name: customerName,
    customer_phone: customerPhone,
    salesperson_name: salespersonName,
    status: remainingBalance <= 0 ? "Debt Paid in Full" : `Partial Payment (Remaining: ₵${remainingBalance.toFixed(2)})`,
    previous_balance: previousBalance,
    remaining_balance: remainingBalance,
  };
}
