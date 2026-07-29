"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { SaleActions } from "@/components/sale-actions";

interface DailySalesProps {
  userId?: string; // If provided, filter by this user
  canManageSales?: boolean;
}

interface Sale {
    id: string;
    quantity: number;
    total_price: number;
    amount_paid: number;
    created_at: string;
    salesperson_id: string;
    product_name?: string;
    customers?: {
        id: string;
        name: string;
    };
    inventory?: {
        name: string;
        sku: string;
    };
}

interface Payment {
  id: string;
  created_at: string;
  amount: number;
  recorded_by: string;
  sales: {
    id: string;
    created_at: string;
    product_name?: string;
    customer_id?: string;
    customers?: {
      id: string;
      name: string;
    };
    inventory?: {
      name: string;
    };
  };
}

interface UnifiedRow {
  id: string;
  key: string;
  time: string;
  type: 'sale' | 'payment';
  productName: string;
  quantity: number | string;
  totalPrice: number | null;
  amountPaidToday: number;
  amountPaidTotal?: number;
  salespersonId: string;
  customerName?: string;
}

export function DailySales({ userId, canManageSales = false }: DailySalesProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [salespersonMap, setSalespersonMap] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchDailyData = async () => {
      setLoading(true);
      
      const parts = selectedDate.split('-');
      
      if (parts.length !== 3) {
        setSales([]);
        setPayments([]);
        setLoading(false);
        return;
      }
      
      const [year, month, day] = parts.map(Number);
      
      if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
        setSales([]);
        setPayments([]);
        setLoading(false);
        return;
      }
      
      const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

      // 1. Fetch Sales created today
      let salesQuery = supabase
        .from("sales")
        .select(`
          id,
          quantity,
          total_price,
          amount_paid,
          created_at,
          salesperson_id,
          product_name,
          customers (
            id,
            name
          ),
          inventory (
            name,
            sku
          )
        `)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false });

      if (userId) {
        salesQuery = salesQuery.eq("salesperson_id", userId);
      }

      // 2. Fetch Payments recorded today
      let paymentsQuery = supabase
        .from("payments")
        .select(`
          id,
          created_at,
          amount,
          recorded_by,
          sales!inner (
            id,
            created_at,
            product_name,
            customer_id,
            customers (
              id,
              name
            ),
            inventory (
              name
            )
          )
        `)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false });

      if (userId) {
        paymentsQuery = paymentsQuery.eq("recorded_by", userId);
      }

      const [salesRes, paymentsRes] = await Promise.all([salesQuery, paymentsQuery]);

      if (salesRes.error) {
        console.error("Error fetching sales:", salesRes.error);
      }
      if (paymentsRes.error) {
        console.error("Error fetching payments:", paymentsRes.error);
      }

      const salesData = salesRes.data || [];
      const paymentsData = (paymentsRes.data as unknown as Payment[]) || [];

      // @ts-ignore
      setSales(salesData);
      setPayments(paymentsData);
      
      // Fetch salesperson names if needed
      if (!userId && (salesData.length > 0 || paymentsData.length > 0)) {
          const salesUserIds = salesData.map((s: any) => s.salesperson_id);
          const paymentsUserIds = paymentsData.map((p: any) => p.recorded_by);
          const userIds = Array.from(new Set([...salesUserIds, ...paymentsUserIds].filter(Boolean)));
          
          if (userIds.length > 0) {
              const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name, role")
                .in("id", userIds);
              
              const map: Record<string, string> = {};
              
              if (profiles) {
                  profiles.forEach((p: any) => {
                      const isManager = p.role === 'manager' || !p.role;
                      let displayName = p.full_name || (isManager ? "Manager" : "Unknown");
                      if (isManager && p.full_name) {
                          displayName = `${p.full_name} (Manager)`;
                      }
                      map[p.id] = displayName;
                  });
              }

              userIds.forEach((id: unknown) => {
                  const idStr = id as string;
                  if (!map[idStr]) {
                      map[idStr] = "Manager";
                  }
              });

              setSalespersonMap(map);
          }
      }
      setLoading(false);
    };

    fetchDailyData();

    // Realtime subscription - listen for changes to sales and payments tables
    const channel = supabase
        .channel(`daily_sales_ledger_${selectedDate}_${userId || 'all'}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sales' },
          () => {
            fetchDailyData();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'payments' },
          () => {
            fetchDailyData();
          }
        )
        .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, [selectedDate, userId]);

  // Build unifiedRows
  const parts = selectedDate.split('-');
  const [year, month, day] = parts.map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  const unifiedRows: UnifiedRow[] = [];

  // Add Sales created today
  sales.forEach((sale) => {
    // Sum payments recorded today for this specific sale
    const todayPaymentsForSale = payments.filter((p) => p.sales?.id === sale.id);
    const paidToday = todayPaymentsForSale.reduce((sum, p) => sum + p.amount, 0);

    unifiedRows.push({
      id: sale.id,
      key: `sale_${sale.id}`,
      time: sale.created_at,
      type: 'sale',
      productName: sale.inventory?.name || sale.product_name || "Unknown Product",
      quantity: sale.quantity,
      totalPrice: sale.total_price,
      amountPaidToday: paidToday,
      amountPaidTotal: sale.amount_paid,
      salespersonId: sale.salesperson_id,
      customerName: sale.customers?.name
    });
  });

  // Add payments recorded today that are for sales created BEFORE today (later debt payments)
  payments.forEach((payment) => {
    const saleCreatedAt = payment.sales?.created_at;
    if (saleCreatedAt) {
      const saleCreatedDate = new Date(saleCreatedAt);
      if (saleCreatedDate < startDate) {
        unifiedRows.push({
          id: payment.id,
          key: `payment_${payment.id}`,
          time: payment.created_at,
          type: 'payment',
          productName: `${payment.sales?.inventory?.name || payment.sales?.product_name || "Unknown"} (Debt Payment)`,
          quantity: "-",
          totalPrice: null,
          amountPaidToday: payment.amount,
          salespersonId: payment.recorded_by,
          customerName: payment.sales?.customers?.name
        });
      }
    }
  });

  // Sort unifiedRows chronologically (newest first)
  unifiedRows.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // Total value of items sold today (regardless of payment)
  const totalSalesRevenue = sales.reduce((sum, sale) => sum + (sale.total_price || 0), 0);

  // Total cash collected today (all payments recorded today)
  const totalCashCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  // Total from sales created today that were actually paid today (sum of payments tied to today's sales)
  const totalSalesCollected = sales.reduce((sum, sale) => {
    const paidTodayForSale = payments
      .filter((p) => p.sales?.id === sale.id)
      .reduce((s, p) => s + p.amount, 0);
    return sum + paidTodayForSale;
  }, 0);

  // Payments made today that are for sales created before today (debt payments)
  const paymentsForOlderSales = payments.reduce((sum, p) => {
    const saleCreatedAt = p.sales?.created_at;
    if (!saleCreatedAt) return sum;
    const saleCreatedDate = new Date(saleCreatedAt);
    if (saleCreatedDate < startDate) return sum + p.amount;
    return sum;
  }, 0);

  // Combined total the salesperson has for the day: money moved today from immediate sales + debt payments
  const combinedTotal = totalSalesCollected + paymentsForOlderSales;

  return (
    <Card suppressHydrationWarning>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
                <CardTitle>Sales & Cash Report</CardTitle>
                <Input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-auto"
                />
            </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300">
            Showing all activity for {new Date(selectedDate).toLocaleDateString()}.
        </p>

        {/* Stats Grid - single combined card only; details moved into popover */}
        <div className="grid grid-cols-1 gap-4 mt-4">
          <Popover>
            <PopoverTrigger asChild>
              <div className="p-4 border rounded-lg bg-lime-50/30 dark:bg-lime-950/10 border-lime-100 dark:border-lime-800 cursor-pointer flex flex-col justify-center">
                <span className="text-xs font-semibold text-lime-700 dark:text-lime-300 uppercase tracking-wider">
                  Today's Total (Sales Collected + Debt Payments)
                </span>
                <span className="text-2xl font-bold text-lime-700 dark:text-lime-300 mt-1">
                  ₵{combinedTotal.toFixed(2)}
                </span>
                <span className="text-xs text-lime-700 dark:text-lime-300 mt-1">
                  Click for breakdown and revenue details
                </span>
              </div>
            </PopoverTrigger>
            <PopoverContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-300">Sales Collected (today)</div>
                  <div className="font-semibold">₵{totalSalesCollected.toFixed(2)}</div>
                </div>
                <div className="flex justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-300">Debt Payments (today)</div>
                  <div className="font-semibold">₵{paymentsForOlderSales.toFixed(2)}</div>
                </div>
                <div className="border-t pt-2">
                  <div className="text-sm text-gray-600 dark:text-gray-300">Total Sales Revenue (items sold today)</div>
                  <div className="font-semibold mt-1">₵{totalSalesRevenue.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mt-1">(Includes items sold on credit — not necessarily received today)</div>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <div className="text-sm font-medium">Combined</div>
                  <div className="font-bold">₵{combinedTotal.toFixed(2)}</div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Product / Details</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Total Price</TableHead>
              <TableHead className="text-right">Paid Today</TableHead>
              <TableHead>Salesperson</TableHead>
              {canManageSales && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow>
                  <TableCell colSpan={canManageSales ? 9 : 8} className="text-center py-8">
                        Loading daily ledger data...
                    </TableCell>
                </TableRow>
            ) : unifiedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManageSales ? 9 : 8} className="text-center text-gray-700 dark:text-gray-300 py-8">
                        No activity recorded for this date.
                    </TableCell>
                </TableRow>
            ) : (
                unifiedRows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>
                  {new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </TableCell>
                <TableCell>
                  {row.type === 'sale' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      Sale
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      Payment
                    </span>
                  )}
                </TableCell>
                <TableCell>
                    <div className={row.type === 'payment' ? "font-medium text-blue-600 dark:text-blue-400" : "font-medium"}>
                        {row.productName}
                    </div>
                </TableCell>
                <TableCell>{row.customerName || "Walk-in"}</TableCell>
                <TableCell className="text-right">{row.quantity}</TableCell>
                <TableCell className="text-right">
                  {row.totalPrice !== null ? `₵${row.totalPrice.toFixed(2)}` : "-"}
                  {row.type === 'sale' && row.totalPrice !== null && (row.amountPaidTotal || 0) < row.totalPrice && (
                    <div className="text-xs text-red-500 font-medium">
                      Owed: ₵{(row.totalPrice - (row.amountPaidTotal || 0)).toFixed(2)}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right text-green-600 font-semibold">
                    ₵{row.amountPaidToday.toFixed(2)}
                </TableCell>
                <TableCell>
                    {row.salespersonId === currentUserId 
                        ? "You" 
                        : (salespersonMap[row.salespersonId] || "Unknown")}
                </TableCell>
                {canManageSales && (
                    <TableCell>
                        {row.type === 'sale' ? <SaleActions saleId={row.id} /> : "-"}
                    </TableCell>
                )}
              </TableRow>
            )))}
          </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

