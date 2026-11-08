"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { recordPayment, recordCustomerPayment, deleteSale } from "@/app/actions"
import { POSReceipt } from "./pos-receipt"
import type { ReceiptDataPayload } from "@/lib/receipt-utils"
import { Trash2, MoreHorizontal, Loader2 } from "lucide-react"

interface Customer {
    id: string
    name: string
    phone: string
    debtAmount: number
}

interface DebtSale {
    id: string
    created_at: string
    total_price: number
    amount_paid: number
    quantity: number
    product_name?: string
    inventory?: {
        name: string
    }
}

interface PaymentRecord {
    id: string
    created_at: string
    amount: number
    sales?: {
        product_name?: string
        inventory?: {
            name: string
        }
    }
}

export function DebtManager({ canDelete = false }: { canDelete?: boolean }) {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [debts, setDebts] = useState<DebtSale[]>([])
    const [payments, setPayments] = useState<PaymentRecord[]>([])
    const [view, setView] = useState<'debts' | 'payments'>('debts')
    const [loading, setLoading] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState<string>("")
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
    const [isCustomerPayment, setIsCustomerPayment] = useState(false)
    const [paymentReceipt, setPaymentReceipt] = useState<ReceiptDataPayload | null>(null)
    const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)

    const supabase = createClient()
    const submittingRef = useRef(false)

    const fetchCustomersWithDebt = async () => {
        // Fetch sales that have a customer and then roll them up by customer so
        // only customers with a positive remaining balance stay in the list.
        const { data: sales, error } = await supabase
            .from("sales")
            .select("id, customer_id, total_price, amount_paid, customers(id, name, phone)")
            .not('customer_id', 'is', null)
        
        if (error) {
            console.error("Error fetching customers with debt:", error)
            setCustomers([])
            return
        }
        
        if (sales && sales.length > 0) {
            const customerDebtMap = new Map<string, Customer>()

            sales.forEach((sale: any) => {
                const outstanding = Number(sale.total_price || 0) - Number(sale.amount_paid || 0)

                if (!sale.customers || outstanding <= 0) {
                    return
                }

                const existingCustomer = customerDebtMap.get(sale.customers.id)
                const nextDebtAmount = (existingCustomer?.debtAmount || 0) + outstanding

                customerDebtMap.set(sale.customers.id, {
                    id: sale.customers.id,
                    name: sale.customers.name,
                    phone: sale.customers.phone,
                    debtAmount: nextDebtAmount,
                })
            })

            setCustomers(
                Array.from(customerDebtMap.values()).sort((left, right) => right.debtAmount - left.debtAmount)
            )
        } else {
            setCustomers([])
        }
    }

    const fetchCustomerDebts = async (customerId: string) => {
        // Don't rely solely on the `status` column — filter by outstanding amount
        const { data, error } = await supabase
            .from("sales")
            .select(`
                id, created_at, total_price, amount_paid, status, quantity, product_name,
                inventory(name)
            `)
            .eq("customer_id", customerId)
            .order("created_at", { ascending: true })
        
        if (error) {
            console.error("Error fetching customer debts:", error)
            setDebts([])
            return
        }
        
        if (data) {
            // Filter to only show sales with outstanding debt (protects against status mismatches)
            const outstandingDebts = data.filter((sale: any) => (sale.amount_paid || 0) < sale.total_price)
            // Ensure we return a consistent shape for the UI
            // @ts-ignore
            setDebts(outstandingDebts)
        } else {
            setDebts([])
        }
    }

    const fetchCustomerPayments = async (customerId: string) => {
        const { data, error } = await supabase
            .from("payments")
            .select(`
                id, created_at, amount,
                sales!inner(
                    customer_id,
                    product_name,
                    inventory(name)
                )
            `)
            .eq("sales.customer_id", customerId)
            .order("created_at", { ascending: false })
        
        if (error) {
            console.error("Error fetching customer payments:", error)
            setPayments([])
            return
        }
        
        if (data) {
            // @ts-ignore
            setPayments(data || [])
        } else {
            setPayments([])
        }
    }

    const handlePayment = async () => {
        if (!paymentAmount) return
        const amount = parseFloat(paymentAmount)
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid positive payment amount.")
            return
        }

        if (isCustomerPayment && selectedCustomer) {
            if (amount > totalDebt) {
                alert(`Payment amount cannot exceed the total outstanding debt of ₵${totalDebt.toFixed(2)}.`)
                return
            }
        } else if (selectedSaleId) {
            const selectedSale = debts.find(d => d.id === selectedSaleId)
            if (selectedSale) {
                const saleOwed = selectedSale.total_price - (selectedSale.amount_paid || 0)
                if (amount > saleOwed) {
                    alert(`Payment amount cannot exceed the item's outstanding debt of ₵${saleOwed.toFixed(2)}.`)
                    return
                }
            }
        }

        if (submittingRef.current) return // Prevent double submission
        submittingRef.current = true
        
        setLoading(true)
        try {
            let res: any = null
            if (isCustomerPayment && selectedCustomer) {
                res = await recordCustomerPayment(selectedCustomer.id, amount)
            } else if (selectedSaleId) {
                res = await recordPayment(selectedSaleId, amount)
            }
            
            setPaymentDialogOpen(false)
            setPaymentAmount("")
            if (selectedCustomer) {
                fetchCustomerDebts(selectedCustomer.id)
                fetchCustomerPayments(selectedCustomer.id)
                fetchCustomersWithDebt() // Refresh list in case customer is fully paid
            }

            // Open printable debt payment receipt dialog
            if (res?.receipt?.receipt_data) {
                setPaymentReceipt(res.receipt.receipt_data)
                setReceiptDialogOpen(true)
            }
        } catch (e: unknown) {
            console.error(e)
            const msg = e instanceof Error ? e.message : "Unknown error"
            alert(`Failed to record payment: ${msg}`)
        } finally {
            setLoading(false)
            submittingRef.current = false
        }
    }

    useEffect(() => {
        fetchCustomersWithDebt()
    }, [])

    useEffect(() => {
        if (selectedCustomer) {
            fetchCustomerDebts(selectedCustomer.id)
            fetchCustomerPayments(selectedCustomer.id)
            setView('debts')
        }
    }, [selectedCustomer])

    // Realtime Supabase synchronization for sales and payments
    useEffect(() => {
        const salesChannel = supabase
            .channel("realtime-debts-sales")
            .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => {
                fetchCustomersWithDebt()
                if (selectedCustomer) {
                    fetchCustomerDebts(selectedCustomer.id)
                }
            })
            .subscribe()

        const paymentsChannel = supabase
            .channel("realtime-debts-payments")
            .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
                fetchCustomersWithDebt()
                if (selectedCustomer) {
                    fetchCustomerDebts(selectedCustomer.id)
                    fetchCustomerPayments(selectedCustomer.id)
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(salesChannel)
            supabase.removeChannel(paymentsChannel)
        }
    }, [selectedCustomer])

    const totalDebt = debts.reduce((sum, debt) => sum + (debt.total_price - (debt.amount_paid || 0)), 0)

    return (
        <div className="space-y-4">
            <div className="bg-lime-50 dark:bg-slate-800/80 p-4 rounded-xl border border-lime-200 dark:border-slate-700 text-sm text-gray-800 dark:text-gray-200 shadow-sm">
                <strong>💡 Pro-tip:</strong> To issue credit or record a new customer debt, add items to the cart, select or enter the customer at checkout, and enter a partial amount or ₵0.00.
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Customers with Debt</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {customers.length === 0 ? (
                            <p className="text-gray-700 dark:text-gray-300">No outstanding debts.</p>
                        ) : (
                            <div className="space-y-2">
                                {customers.map(customer => (
                                    <div 
                                        key={customer.id}
                                        className={`p-3 border rounded cursor-pointer hover:bg-accent ${selectedCustomer?.id === customer.id ? 'bg-accent' : ''}`}
                                        onClick={() => setSelectedCustomer((prev) => prev?.id === customer.id ? null : customer)}
                                    >
                                        <div className="font-medium">{customer.name}</div>
                                        <div className="text-sm text-gray-700 dark:text-gray-400">{customer.phone}</div>
                                        <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                                            Owes ₵{customer.debtAmount.toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle>
                                {selectedCustomer ? selectedCustomer.name : "Select a Customer"}
                            </CardTitle>
                            {selectedCustomer && (
                                <div className="flex gap-2 text-sm">
                                    <button 
                                        onClick={() => setView('debts')}
                                        className={`hover:underline ${view === 'debts' ? 'font-bold text-primary' : 'text-gray-700 dark:text-gray-400'}`}
                                    >
                                        Outstanding Debts
                                    </button>
                                    <span className="text-gray-700 dark:text-gray-400">|</span>
                                    <button 
                                        onClick={() => setView('payments')}
                                        className={`hover:underline ${view === 'payments' ? 'font-bold text-primary' : 'text-gray-700 dark:text-gray-400'}`}
                                    >
                                        Payment History
                                    </button>
                                </div>
                            )}
                        </div>
                        {selectedCustomer && totalDebt > 0 && view === 'debts' && (
                            <Button 
                                size="sm" 
                                onClick={() => {
                                    setIsCustomerPayment(true)
                                    setSelectedSaleId(null)
                                    setPaymentAmount(totalDebt.toFixed(2))
                                    setPaymentDialogOpen(true)
                                }}
                            >
                                Record Customer Payment
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {!selectedCustomer ? (
                            <p className="text-gray-700 dark:text-gray-300">Select a customer to view details.</p>
                        ) : view === 'debts' ? (
                            <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right">Owed</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {debts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                No outstanding debts.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        debts.map(debt => (
                                        <TableRow key={debt.id}>
                                            <TableCell>{new Date(debt.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>{debt.inventory?.name || debt.product_name || "General Item"}</TableCell>
                                            <TableCell className="text-right">{debt.quantity}</TableCell>
                                            <TableCell className="text-right">₵{(debt.total_price / debt.quantity).toFixed(2)}</TableCell>
                                            <TableCell className="text-right text-red-500 font-bold">
                                                ₵{(debt.total_price - (debt.amount_paid || 0)).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="flex gap-2 items-center">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => {
                                                        setIsCustomerPayment(false)
                                                        setSelectedSaleId(debt.id)
                                                        setPaymentAmount((debt.total_price - (debt.amount_paid || 0)).toFixed(2))
                                                        setPaymentDialogOpen(true)
                                                    }}
                                                >
                                                    Pay Item
                                                </Button>
                                                
                                                {canDelete && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600"
                                                            onClick={async () => {
                                                                if (confirm("Are you sure you want to delete this debt? This will restore the inventory.")) {
                                                                    await deleteSale(debt.id);
                                                                    if (selectedCustomer) {
                                                                        fetchCustomerDebts(selectedCustomer.id);
                                                                        fetchCustomersWithDebt();
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete Debt
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )))}
                                </TableBody>
                            </Table>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Item Paid For</TableHead>
                                        <TableHead>Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                                No payments recorded.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        payments.map(payment => (
                                        <TableRow key={payment.id}>
                                            <TableCell>{new Date(payment.created_at).toLocaleDateString()} {new Date(payment.created_at).toLocaleTimeString()}</TableCell>
                                            <TableCell>{payment.sales?.inventory?.name || payment.sales?.product_name || "Debt Payment"}</TableCell>
                                            <TableCell className="text-green-600 font-bold">
                                                ₵{payment.amount.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    )))}
                                </TableBody>
                            </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {isCustomerPayment ? `Record Payment for ${selectedCustomer?.name}` : "Record Item Payment"}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label>Amount</label>
                                <Input 
                                    type="number" 
                                    value={paymentAmount} 
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                                {isCustomerPayment && (
                                    <p className="text-xs text-muted-foreground">
                                        Enter any amount. The payment will automatically distribute from the oldest outstanding debt to the newest. Any remaining unpaid balance will stay on the newer items.
                                    </p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handlePayment} disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Recording...
                                    </>
                                ) : "Confirm Payment"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Printable Debt Payment Receipt Dialog */}
                <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
                    <DialogContent className="max-w-md w-[95vw]">
                        <DialogHeader>
                            <DialogTitle>Debt Payment Receipt</DialogTitle>
                        </DialogHeader>
                        {paymentReceipt && (
                            <div className="space-y-4">
                                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg p-2.5 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
                                    ✓ Debt payment confirmed. Printable receipt generated below:
                                </div>
                                <POSReceipt receipt={paymentReceipt} compact={false} />
                                <Button
                                    onClick={() => setReceiptDialogOpen(false)}
                                    className="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold"
                                >
                                    Done
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}