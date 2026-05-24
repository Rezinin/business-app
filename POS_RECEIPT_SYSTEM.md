# POS Receipt System Documentation

## Overview
A complete Point-of-Sale (POS) receipt system for Rezinin Enterprise that automatically generates, tracks, and allows printing/downloading of professional receipts for every sale.

## Features Implemented

### 1. **Automatic Receipt Generation**
   - Every sale automatically generates a unique receipt
   - Receipt number format: `REC-YYYYMMDD-XXXXX` (e.g., REC-20260524-685720495)
   - Unique sequential numbering based on timestamp
   - Receipts stored in database for tracking and audit purposes

### 2. **Professional Receipt Format**
   - **Business Header**: 
     - Company name (Rezinin Enterprise)
     - Location/Address (Ghana)
     - Phone number and Tax ID
   
   - **Transaction Details**:
     - Receipt number and date/time
     - Item line items with quantity, unit price, and total
     - Multiple items support (for bulk sales)
   
   - **Financial Summary**:
     - Subtotal calculation
     - Tax support (ready for future implementation)
     - Total amount due
   
   - **Payment Information**:
     - Payment method (Cash/Credit)
     - Amount paid
     - Change calculation for cash payments
     - Payment status indicator for credit sales
   
   - **Parties Information**:
     - Customer name and phone (for credit sales)
     - Salesperson name
   
   - **Footer**:
     - Thank you message
     - Record-keeping reminder

### 3. **Print Functionality**
   - One-click "Print" button opens print dialog
   - Receipt automatically formatted for standard printer
   - Professional monospace font for receipt appearance
   - Optimized for thermal printer or regular paper

### 4. **Download Functionality**
   - "Download" button creates downloadable receipt
   - Converts receipt to printable format
   - Can be saved as reference or sent to customer

### 5. **Receipt Tracking & History**
   - All receipts stored in `receipts` database table
   - Receipt History component shows recent receipts
   - Track print count and last printed date
   - View and reprint old receipts anytime
   - Audit trail for compliance

## Database Structure

### Receipts Table
```sql
CREATE TABLE receipts (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP,
  sale_id UUID REFERENCES sales(id),
  receipt_number TEXT UNIQUE,
  receipt_data JSONB,  -- Stores complete receipt as JSON
  printed_count INTEGER,  -- Tracks number of prints
  last_printed TIMESTAMP
);
```

### Receipt Data Structure
```typescript
{
  receipt_number: "REC-20260524-685720495",
  business_name: "Rezinin Enterprise",
  business_address: "Ghana",
  business_phone: "+233 XXX XXX XXXX",
  business_tax_id: "TIN: XXXXXXXXX",
  date: "05/24/2026",
  time: "12:46:08 PM",
  items: [
    {
      name: "Traditional Kente Cloth",
      quantity: 1,
      unit_price: 150.00,
      total_price: 150.00
    }
  ],
  subtotal: 150.00,
  tax: null,  // Optional for future tax implementation
  total: 150.00,
  payment_method: "Cash",  // or "Credit"
  amount_paid: 150.00,
  change: 0.00,  // If applicable
  customer_name: null,  // For credit sales
  customer_phone: null,  // For credit sales
  salesperson_name: "Rushdan",
  status: "paid"  // or "pending" for credit sales
}
```

## Components

### 1. **POSReceipt Component** (`components/pos-receipt.tsx`)
   - Displays formatted receipt
   - Print and Download buttons
   - Responsive design
   - Monospace font styling

### 2. **ReceiptHistory Component** (`components/receipt-history.tsx`)
   - Lists recent receipts
   - View individual receipt details
   - Reprint receipts (updates print count)
   - Configurable limit (default: 10 receipts)

### 3. **RecordSaleButton Component** (Updated)
   - Now displays receipt after sale recording
   - Shows receipt in modal dialog
   - Allows immediate printing/downloading

## Utility Functions (`lib/receipt-utils.ts`)

### `generateReceiptNumber()`
- Creates unique receipt number based on timestamp
- Format: `REC-YYYYMMDD-XXXXX`

### `formatReceiptDateTime()`
- Formats current date and time for receipt
- Returns localized date/time strings

### `buildReceiptData()`
- Constructs complete receipt data object
- Calculates totals and change
- Includes all transaction details

## Server Action Updates (`app/actions.ts`)

### `recordSale()` - Enhanced
- Now generates receipt data
- Creates receipt record in database
- Returns both sale and receipt information
- Fetches customer and salesperson details for receipt

## Integration Points

### Current Flow
1. User clicks "Record Sale" button
2. Enters quantity and payment info
3. Clicks "Confirm Sale"
4. Sale is recorded in database
5. Receipt is automatically generated
6. Receipt preview dialog opens
7. User can Print, Download, or Close
8. Sale data is reflected in dashboard

### Future Enhancements
1. **Tax Calculation**: Add tax percentage to receipt
2. **Multi-Item Sales**: Allow selling multiple items in one transaction
3. **Email Receipts**: Send receipt to customer email
4. **Receipt Lookup**: Search and filter receipts by date/customer
5. **Return Receipts**: Support return transactions with refund receipts
6. **Digital Wallet Integration**: QR code for digital payment options
7. **Inventory History Link**: Associate receipt with inventory changes
8. **Receipt Templates**: Customizable receipt layouts

## Usage Examples

### View Recent Receipts
```tsx
import { ReceiptHistory } from "@/components/receipt-history";

export function ReceiptsPage() {
  return (
    <div>
      <h1>Receipt History</h1>
      <ReceiptHistory limit={20} />
    </div>
  );
}
```

### Automatic Receipt on Sale
- No code changes needed - happens automatically when `recordSale()` is called
- Receipt appears in modal after sale confirmation

### Access Receipt Data
```typescript
const { sale, receipt } = await recordSale(productId, quantity, price);
// receipt.receipt_data contains all receipt information
```

## Business Value

1. **Professional Image**: Professional receipts enhance customer trust
2. **Record Keeping**: Complete audit trail of all transactions
3. **Compliance**: Receipts stored for tax and legal purposes
4. **Customer Service**: Easy reprinting for customer requests
5. **Print Tracking**: Know how many times each receipt was printed
6. **Mobile-Friendly**: Receipts work on any device
7. **No External Services**: Self-contained, no third-party integration needed

## Technical Notes

- Receipts stored as JSON in database for flexibility
- Automatic unique number generation prevents duplicates
- Print count tracking helps identify frequently reprinted receipts
- Receipt HTML formatted for both screen and print viewing
- Monospace font ensures receipt appearance consistency
- All data captured at point of sale for accuracy

## Next Steps for Business Owner

1. Test receipt printing on your actual printer
2. Add your business contact information to receipt header
3. Consider tax ID and business registration details
4. Plan for multi-item receipt support
5. Integrate with email system for customer receipts
6. Create receipt archival policy (retention period)
7. Train staff on receipt printing and storage

## Customization Guide

### Update Business Info in Receipt
Edit `lib/receipt-utils.ts` in `buildReceiptData()`:
```typescript
business_name: "Your Company Name",
business_address: "Your Address",
business_phone: "Your Phone",
business_tax_id: "Your Tax ID",
```

### Change Receipt Format
Edit `components/pos-receipt.tsx` to modify styling, colors, or layout.

### Add Custom Fields
Extend `ReceiptDataPayload` interface and `buildReceiptData()` function.
