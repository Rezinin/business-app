"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { recordSale, createCustomer } from "@/app/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { POSReceipt } from "@/components/pos-receipt"
import type { ReceiptDataPayload } from "@/lib/receipt-utils"

interface Product {
    id: string
    name: string
    price: number
    quantity: number
}

interface Customer {
    id: string
    name: string
}

export function RecordSaleButton({ product }: { product: Product }) {
    const [open, setOpen] = useState(false)
    const [quantity, setQuantity] = useState(1)
    const [loading, setLoading] = useState(false)
    const [isCredit, setIsCredit] = useState(false)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
    const [amountPaid, setAmountPaid] = useState<string>("")
    
    // New customer form
    const [isNewCustomer, setIsNewCustomer] = useState(false)
    const [newCustomerName, setNewCustomerName] = useState("")
    const [newCustomerPhone, setNewCustomerPhone] = useState("")
    
    // Receipt display
    const [showReceipt, setShowReceipt] = useState(false)
    const [receiptData, setReceiptData] = useState<ReceiptDataPayload | null>(null)
    const [allowNegativeInventory, setAllowNegativeInventory] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        if (open && isCredit) {
            fetchCustomersWithDebt()
        }
    }, [open, isCredit])

    useEffect(() => {
        const loadInventoryPolicy = async () => {
            const { data, error } = await supabase
                .from("inventory_settings")
                .select("allow_negative_inventory")
                .eq("id", 1)
                .single()

            if (!error && data) {
                setAllowNegativeInventory(Boolean(data.allow_negative_inventory))
            }
        }

        loadInventoryPolicy()
    }, [supabase])

    const fetchCustomersWithDebt = async () => {
        const { data, error } = await supabase
            .from("sales")
            .select("customer_id, amount_paid, total_price, customers(id, name)")
            .not("customer_id", "is", null)

        if (error) {
            console.error("Error fetching customers with debt:", error)
            setCustomers([])
            return
        }

        const customerMap = new Map<string, Customer>()

        data?.forEach((sale: any) => {
            const outstanding = Number(sale.total_price || 0) - Number(sale.amount_paid || 0)

            if (sale.customers && outstanding > 0) {
                customerMap.set(sale.customers.id, {
                    id: sale.customers.id,
                    name: sale.customers.name,
                })
            }
        })

        setCustomers(Array.from(customerMap.values()).sort((left, right) => left.name.localeCompare(right.name)))
    }

    const handleSale = async () => {
        if (quantity <= 0) return;
        if (!allowNegativeInventory && quantity > product.quantity) {
            alert("Not enough stock");
            return;
        }

        setLoading(true)
        try {
            let customerId = selectedCustomerId

            if (isCredit) {
                if (isNewCustomer) {
                    if (!newCustomerName) {
                        alert("Please enter customer name")
                        setLoading(false)
                        return
                    }
                    const newCustomer = await createCustomer(newCustomerName, newCustomerPhone)
                    customerId = newCustomer.id
                } else if (!customerId) {
                    alert("Please select a customer")
                    setLoading(false)
                    return
                }
            }

            const paid = isCredit ? (parseFloat(amountPaid) || 0) : (product.price * quantity)

            const result = await recordSale(product.id, quantity, product.price, customerId || undefined, paid)
            
            // Show receipt
            if (result.receipt?.receipt_data) {
                setReceiptData(result.receipt.receipt_data)
                setShowReceipt(true)
            }
            
            // Close sale dialog and reset form
            setOpen(false)
            setQuantity(1)
            setIsCredit(false)
            setAmountPaid("")
            setSelectedCustomerId("")
            setIsNewCustomer(false)
            setNewCustomerName("")
        } catch (e: any) {
            console.error(e);
            alert(`Failed to record sale: ${e.message || "Unknown error"}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full" disabled={!allowNegativeInventory && product.quantity <= 0}>
                        {allowNegativeInventory || product.quantity > 0 ? "Record Sale" : "Out of Stock"}
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Record Sale: {product.name}</DialogTitle>
                        <DialogDescription>
                            Enter the quantity sold. Current stock: {product.quantity}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="quantity" className="text-right">
                                Quantity
                            </Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                max={allowNegativeInventory ? undefined : product.quantity}
                                value={quantity}
                                onChange={(e) => {
                                    const nextQuantity = Math.max(1, parseInt(e.target.value) || 1)
                                    setQuantity(allowNegativeInventory ? nextQuantity : Math.min(nextQuantity, product.quantity))
                                }}
                                className="col-span-3"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="credit" 
                                checked={isCredit} 
                                onCheckedChange={(c) => setIsCredit(!!c)} 
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="credit">Sell on Credit / Partial Payment</Label>
                                <p className="text-xs text-muted-foreground">
                                    Check this if the customer is not paying the full amount now.
                                </p>
                            </div>
                        </div>

                        {isCredit && (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Customer</Label>
                                    <div className="col-span-3">
                                        {!isNewCustomer ? (
                                            <div className="flex gap-2">
                                                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Customer" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {customers.map(c => (
                                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button variant="outline" size="icon" onClick={() => setIsNewCustomer(true)} title="New Customer">
                                                    +
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Input 
                                                    placeholder="Name" 
                                                    value={newCustomerName} 
                                                    onChange={e => setNewCustomerName(e.target.value)} 
                                                />
                                                <Input 
                                                    placeholder="Phone" 
                                                    value={newCustomerPhone} 
                                                    onChange={e => setNewCustomerPhone(e.target.value)} 
                                                />
                                                <Button variant="ghost" size="sm" onClick={() => setIsNewCustomer(false)}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="paid" className="text-right">
                                        Paid Now
                                    </Label>
                                    <Input
                                        id="paid"
                                        type="number"
                                        min="0"
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(e.target.value)}
                                        placeholder="0.00"
                                        className="col-span-3"
                                    />
                                </div>
                            </>
                        )}

                        <div className="text-sm text-muted-foreground text-right">
                            Total: ₵{(quantity * product.price).toFixed(2)}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSale} disabled={loading}>
                            {loading ? "Recording..." : "Confirm Sale"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receipt Display Dialog */}
            <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>📋 Sales Receipt</DialogTitle>
                        <DialogDescription>
                            Sale recorded successfully! Print or download your receipt.
                        </DialogDescription>
                    </DialogHeader>
                    {receiptData && (
                        <div className="py-4">
                            <POSReceipt receipt={receiptData} />
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setShowReceipt(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
