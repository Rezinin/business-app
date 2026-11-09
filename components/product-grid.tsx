"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AddToCartButton } from "./add-to-cart-button";
import { Search, Info, Zap, Plus, Check } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useHardwareBarcodeScanner, CameraBarcodeScanner, LinkBarcodeDialog, playScannerBeep } from "./barcode-scanner";

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  description?: string;
}

function ProductCard({ item }: { item: InventoryItem }) {
  const [showDescription, setShowDescription] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col justify-between border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-start justify-between gap-2 text-base">
          <span className="font-semibold leading-snug">{item.name}</span>
          {item.description && (
            <button
              type="button"
              onClick={() => setShowDescription(!showDescription)}
              className="p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground shrink-0"
              title="Toggle description"
            >
              <Info className={`h-4 w-4 ${showDescription ? "text-primary" : ""}`} />
              <span className="sr-only">Info</span>
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {showDescription && item.description && (
          <div className="mb-3 p-2.5 bg-muted/60 rounded-md text-xs text-muted-foreground border border-border/50">
            {item.description}
          </div>
        )}
        <div className="flex justify-between items-center text-sm mb-1.5">
          <span className="text-xs text-muted-foreground">SKU: {item.sku}</span>
          <span className="text-base font-bold text-lime-700 dark:text-lime-400">₵{item.price.toFixed(2)}</span>
        </div>
        <div className="text-xs mb-3 flex items-center justify-between">
          <span className="text-muted-foreground">Stock:</span>
          {item.quantity <= 0 ? (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">Out of stock</Badge>
          ) : item.quantity < 10 ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-orange-600 border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30">
              Low: {item.quantity}
            </Badge>
          ) : (
            <span className="font-medium text-foreground">{item.quantity} available</span>
          )}
        </div>
        <AddToCartButton product={item} />
      </CardContent>
    </Card>
  );
}

export function ProductGrid({
  inventory: initialInventory,
  canAddProducts = true,
  canPairBarcodes = true,
}: {
  inventory: InventoryItem[];
  canAddProducts?: boolean;
  canPairBarcodes?: boolean;
}) {
  const [items, setItems] = useState<InventoryItem[]>(initialInventory || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [unlinkedBarcode, setUnlinkedBarcode] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { addItem, allowNegativeInventory } = useCart();
  const supabase = createClient();

  // Keep inventory updated in real-time across all cashiers and terminals
  useEffect(() => {
    setItems(initialInventory || []);
  }, [initialInventory]);

  useEffect(() => {
    const channel = supabase
      .channel("realtime_inventory_grid")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((item) => (item.id === payload.new.id ? { ...item, ...payload.new } : item))
            );
          } else if (payload.eventType === "INSERT") {
            setItems((prev) => [payload.new as InventoryItem, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setItems((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase]);

  // Keyboard shortcut: '/' focuses search input from anywhere
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredInventory = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Quick-Pick: Top 8 items with stock
  const quickPickItems = items.filter((i) => i.quantity > 0 || allowNegativeInventory).slice(0, 8);

  const handleQuickAdd = (product: InventoryItem) => {
    addItem({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      quantity: 1,
      available: product.quantity,
    });
    setJustAddedId(product.id);
    playScannerBeep(true);
    setTimeout(() => setJustAddedId(null), 800);
  };

  // Hardware scanner listener (automatic for any USB / Bluetooth barcode scanner gun)
  useHardwareBarcodeScanner({
    inventory: items,
    onProductScanned: handleQuickAdd,
    onUnknownBarcodeScanned: (code) => setUnlinkedBarcode(code),
  });

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredInventory.length === 1) {
      e.preventDefault();
      handleQuickAdd(filteredInventory[0]);
      setSearchTerm("");
    }
  };

  return (
    <div className="space-y-5">
      {/* Fast Search Bar with '/' Shortcut and optional camera scanner */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder="Search product name or SKU (Press '/' to focus)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="pl-9 pr-20 h-10 text-sm bg-white dark:bg-slate-900 shadow-sm"
        />
        <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
          <div className="pointer-events-none hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-border/80 bg-muted text-[10px] font-mono text-muted-foreground">
            /
          </div>
          <CameraBarcodeScanner
            inventory={items}
            onProductScanned={handleQuickAdd}
            onUnknownBarcodeScanned={(code) => setUnlinkedBarcode(code)}
          />
        </div>
      </div>

      {/* Quick-Pick 1-Tap Bar */}
      {quickPickItems.length > 0 && !searchTerm && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            Quick-Pick Bestsellers (1-Tap Add)
          </div>
          <div className="flex flex-wrap gap-2">
            {quickPickItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleQuickAdd(item)}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white dark:bg-slate-900 hover:border-lime-500 hover:bg-lime-50/50 dark:hover:bg-slate-800 text-xs font-medium transition-all shadow-sm active:scale-95 text-left"
              >
                {justAddedId === item.id ? (
                  <Check className="h-3 w-3 text-green-600 animate-in zoom-in" />
                ) : (
                  <Plus className="h-3 w-3 text-muted-foreground group-hover:text-lime-600" />
                )}
                <span className="truncate max-w-[140px]">{item.name}</span>
                <span className="text-lime-700 dark:text-lime-400 font-semibold">₵{item.price.toFixed(0)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredInventory.map((item) => (
          <ProductCard key={item.id} item={item} />
        ))}
        {filteredInventory.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            No products match &ldquo;{searchTerm}&rdquo;
          </div>
        )}
      </div>

      {/* Just-In-Time Barcode Pairing Dialog (Instant scan-to-learn) */}
      <LinkBarcodeDialog
        barcode={unlinkedBarcode}
        inventory={items}
        open={Boolean(unlinkedBarcode)}
        onOpenChange={(open) => !open && setUnlinkedBarcode(null)}
        onLinkedAndAdded={(p) => handleQuickAdd(p as InventoryItem)}
        canAddProducts={canAddProducts}
        canPairBarcodes={canPairBarcodes}
      />
    </div>
  );
}
