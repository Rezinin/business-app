"use client";

import { useState } from "react";
import { createProduct, updateProduct, restockProduct, deleteProduct, updateInventoryPolicy } from "@/app/actions"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash, Edit, Search, Info, RotateCcw, Plus } from "lucide-react";
import { useCart } from "@/lib/cart-context"

type InventoryStats = {
  productCount: number;
  lowStockCount: number;
  totalValue: number;
};

export function InventoryManager({ inventory, stats, canAdd = true, canDelete = true }: { inventory: any[]; stats?: InventoryStats; canAdd?: boolean; canDelete?: boolean }) {
  const [isEditing, setIsEditing] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [addMode, setAddMode] = useState<"new" | "restock">("new");
    const [searchTerm, setSearchTerm] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [savingPolicy, setSavingPolicy] = useState(false)
  const { allowNegativeInventory, setAllowNegativeInventory } = useCart()
  const [error, setError] = useState<string | null>(null);

  const toggleDescription = (id: string) => {
      const newSet = new Set(expandedItems);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setExpandedItems(newSet);
  }

  const filteredInventory = inventory.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddProductClick = () => {
      setError(null);
      if (!isAdding) {
        setAddMode("new");
        setIsAdding(true);
      } else {
        setIsAdding(false);
      }
    };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-lime-600 to-emerald-600 dark:from-lime-400 dark:to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">
          📦 Inventory
        </h2>

        <div className="w-fit max-w-[220px] inline-flex items-start gap-2 rounded-lg border border-lime-200 dark:border-lime-900/60 bg-white/80 dark:bg-slate-900/60 px-3 py-2 shadow-sm">
            <Checkbox
              id="allow-negative-inventory"
              checked={allowNegativeInventory}
              disabled={savingPolicy}
              onCheckedChange={async (checked) => {
                const nextValue = Boolean(checked)
                const previousValue = allowNegativeInventory
                setAllowNegativeInventory(nextValue)
                setSavingPolicy(true)
                try {
                  await updateInventoryPolicy(nextValue)
                } catch (error) {
                  console.error(error)
                  setAllowNegativeInventory(previousValue)
                  alert("Failed to update inventory policy.")
                } finally {
                  setSavingPolicy(false)
                }
              }}
            />
            <div className="space-y-0.5 min-w-0">
              <Label htmlFor="allow-negative-inventory" className="font-medium text-[13px] leading-tight">
                Allow negative inventory
              </Label>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Off by default. Turn it on only if you want overselling past stock.
              </p>
            </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
                  {isAdding ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant={addMode === "new" ? "default" : "outline"}
                        onClick={() => setAddMode("new")}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        New Product
                      </Button>
                      <Button
                        variant={addMode === "restock" ? "default" : "outline"}
                        onClick={() => setAddMode("restock")}
                        className="gap-1"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restock Existing
                      </Button>
                      <Button variant="outline" onClick={() => { setIsAdding(false); setError(null); }}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={handleAddProductClick} disabled={!canAdd}>
                      Add Product
                    </Button>
                  )}
                </div>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border border-lime-200/70 bg-white/80 shadow-sm rounded-xl dark:border-slate-700 dark:bg-slate-900/70 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-300">Total Products</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-3xl font-bold text-lime-700 dark:text-lime-400">{stats.productCount}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">in inventory</p>
            </CardContent>
          </Card>
          <Card className="border border-orange-200/70 bg-white/80 shadow-sm rounded-xl dark:border-slate-700 dark:bg-slate-900/70 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-300">Low Stock Items</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.lowStockCount}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">items with &lt; 10 qty</p>
            </CardContent>
          </Card>
          <Card className="border border-lime-200/70 bg-white/80 shadow-sm rounded-xl dark:border-slate-700 dark:bg-slate-900/70 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-300">Total Value</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-3xl font-bold text-lime-700 dark:text-lime-400">₵{stats.totalValue.toFixed(2)}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">inventory value</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      {isAdding && addMode === "new" && (
              <Card>
                <CardHeader>
                  <CardTitle>Add New Product</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    action={async (formData) => {
                      setError(null);
                      try {
                        const result = await createProduct(formData);
                         if (result && !result.success) {
                           setError(result.error || "Failed to create product");
                         } else {
                          setIsAdding(false);
                        }
                      } catch (err: any) {
                        setError(err.message || "Failed to create product");
                      }
                    }}
                    className="grid gap-4"
                  >
                    {error && (
                      <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm font-medium">
                        {error}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU</Label>
                        <Input id="sku" name="sku" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">Price</Label>
                        <Input id="price" name="price" type="number" step="0.01" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input id="quantity" name="quantity" type="number" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input id="description" name="description" />
                    </div>
                    <Button type="submit">Save Product</Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {isAdding && addMode === "restock" && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Restock Existing Product</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <form
                                action={async (formData) => {
                                  await restockProduct(formData);
                                  setIsAdding(false);
                                  setAddMode("new");
                                }}
                    className="grid gap-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="product-select">Select Product</Label>
                      <select id="product-select" name="id" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="">-- Choose a product to restock --</option>
                        {inventory.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} (SKU: {item.sku}) - Current Qty: {item.quantity}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" disabled className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU</Label>
                        <Input id="sku" name="sku" disabled className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">Price</Label>
                        <Input id="price" name="price" type="number" step="0.01" disabled className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentQuantity">Current Quantity</Label>
                        <Input id="currentQuantity" name="currentQuantity" type="number" disabled className="bg-muted" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Additional Quantity to Add</Label>
                      <Input id="quantity" name="quantity" type="number" required min="1" placeholder="Enter quantity to add" />
                      <p className="text-sm text-muted-foreground">This will be added to the current stock quantity.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input id="description" name="description" disabled className="bg-muted" />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit">Restock Product</Button>
                      <Button type="button" variant="outline" onClick={() => { setAddMode("new"); setIsAdding(false); setError(null); }}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

      <div className="grid gap-4">
        {filteredInventory.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              {isEditing === item.id ? (
                <form
                  action={async (formData) => {
                    setError(null);
                    try {
                      const result = await updateProduct(formData);
                      if (result && !result.success) {
                        setError(result.error || "Failed to update product");
                      } else {
                        setIsEditing(null);
                      }
                    } catch (err: any) {
                      setError(err.message || "Failed to update product");
                    }
                  }}
                  className="grid gap-4"
                >
                  {error && (
                    <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm font-medium">
                      {error}
                    </div>
                  )}
                  <input type="hidden" name="id" value={item.id} />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input name="name" defaultValue={item.name} required />
                    </div>
                    <div className="space-y-2">
                      <Label>SKU</Label>
                      <Input name="sku" defaultValue={item.sku} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input name="price" type="number" step="0.01" defaultValue={item.price} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input name="quantity" type="number" defaultValue={item.quantity} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input name="description" defaultValue={item.description} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">Save Changes</Button>
                    <Button type="button" variant="outline" onClick={() => { setIsEditing(null); setError(null); }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        {item.name}
                        {item.description && (
                            <button 
                                onClick={() => toggleDescription(item.id)}
                                className="p-1 hover:bg-muted rounded-full transition-colors"
                                title="Toggle description"
                            >
                                <Info className={`h-4 w-4 ${expandedItems.has(item.id) ? "text-primary" : "text-muted-foreground"}`} />
                                <span className="sr-only">Info</span>
                            </button>
                        )}
                    </h3>
                    {expandedItems.has(item.id) && item.description && (
                        <div className="mt-2 mb-2 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground border border-border max-w-md">
                            {item.description}
                        </div>
                    )}
                    <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                    <div className="mt-2 space-x-4 text-sm">
                      <span>Price: ₵{item.price}</span>
                      <span>Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center w-full md:w-auto">
                    {canDelete && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setIsEditing(item.id); setError(null); }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={async () => {
                              if (confirm("Are you sure?")) {
                                await deleteProduct(item.id);
                              }
                            }}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filteredInventory.length === 0 && !isAdding && (
            <div className="text-center p-8 text-muted-foreground">
                No products found.
            </div>
        )}
      </div>
    </div>
  );
}
