"use client";

import { useState } from "react";
import { ProductGrid, InventoryItem } from "@/components/product-grid";
import { DailySales } from "@/components/daily-sales";
import { DebtManager } from "@/components/debt-manager";
import { InventoryManager } from "@/components/inventory-manager";
import { UserManager } from "@/components/user-manager";
import { DedicatedCartPage } from "@/components/dedicated-cart-page";
import { ScrollToTop } from "@/components/scroll-to-top";
import { CartSidebar } from "@/components/cart-sidebar";
import { FloatingCartBar } from "@/components/floating-cart-bar";
import { useCart } from "@/lib/cart-context";
import { ShoppingCart, BarChart3, Handshake, Package, Users, Store } from "lucide-react";

interface ManagerDashboardStackProps {
  inventory: InventoryItem[];
  profiles: any[];
  stats: {
    productCount: number;
    lowStockCount: number;
    totalValue: number;
  };
  pendingUsersCount: number;
}

export function ManagerDashboardStack({
  inventory,
  profiles,
  stats,
  pendingUsersCount,
}: ManagerDashboardStackProps) {
  const [activeTab, setActiveTab] = useState<"pos" | "cart" | "inventory" | "reports" | "debts" | "team">("pos");
  const { items, heldCarts } = useCart();
  const totalCartItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const showSidebar = totalCartItems > 0 || heldCarts.length > 0;

  const tabs = [
    {
      id: "pos" as const,
      label: "Products",
      icon: Store,
      badge: null,
    },
    {
      id: "cart" as const,
      label: "Active Cart",
      icon: ShoppingCart,
      badge: totalCartItems > 0 ? totalCartItems : null,
      badgeColor: "bg-emerald-600",
    },
    {
      id: "inventory" as const,
      label: "Inventory",
      icon: Package,
      badge: stats.lowStockCount > 0 ? `${stats.lowStockCount} low` : null,
      badgeColor: "bg-orange-500",
    },
    {
      id: "reports" as const,
      label: "Sales & Cash",
      icon: BarChart3,
      badge: null,
    },
    {
      id: "debts" as const,
      label: "Debts",
      icon: Handshake,
      badge: null,
    },
    {
      id: "team" as const,
      label: "Team",
      icon: Users,
      badge: pendingUsersCount > 0 ? pendingUsersCount : null,
      badgeColor: "bg-red-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Sticky Segmented Stack Switcher Bar - always visible while scrolling */}
      <div className="sticky top-[72px] sm:top-[76px] z-30 py-2 -mx-4 px-4 sm:mx-0 sm:px-0 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-lime-100/60 dark:border-slate-800/60 transition-all">
        <div className="flex items-center justify-center sm:justify-start">
          <div className="inline-flex p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-lime-200/80 dark:border-slate-800 shadow-md gap-1 overflow-x-auto max-w-full">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap active:scale-95 ${
                    isActive
                      ? "bg-gradient-to-r from-lime-600 to-emerald-600 text-white shadow-md shadow-lime-600/20"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-lime-50/70 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-500 dark:text-gray-400"}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== null && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold text-white ${
                        isActive ? "bg-white/30 text-white" : tab.badgeColor || "bg-lime-600"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Slick Animated Stack Viewports */}
      <div className="relative min-h-[500px]">
        {/* Tab 1: Products Catalog — sidebar slides in only when cart has items */}
        {activeTab === "pos" && (
          <div
            key="tab-pos"
            className="animate-in fade-in-50 slide-in-from-bottom-2 duration-200 ease-out fill-mode-both"
          >
            <div className="flex gap-4 items-start">
              {/* Products — always fills all available space */}
              <div className="flex-1 min-w-0">
                <ProductGrid
                  inventory={inventory || []}
                  canAddProducts={true}
                  canPairBarcodes={true}
                />
              </div>

              {/* Slim Cart Sidebar — only appears when there's something to show */}
              {showSidebar && (
                <div className="hidden md:block w-[260px] lg:w-[280px] shrink-0 sticky top-[140px]">
                  <CartSidebar />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Dedicated Full Cart & Checkout Page */}
        {activeTab === "cart" && (
          <div
            key="tab-cart"
            className="animate-in fade-in-50 slide-in-from-bottom-2 duration-200 ease-out fill-mode-both"
          >
            <DedicatedCartPage onBrowseProducts={() => setActiveTab("pos")} />
          </div>
        )}

        {/* Tab 3: Inventory & Operations */}
        {activeTab === "inventory" && (
          <div
            key="tab-inventory"
            className="animate-in fade-in-50 slide-in-from-bottom-2 duration-200 ease-out fill-mode-both space-y-4"
          >
            <div className="mb-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white drop-shadow-sm flex items-center gap-2">
                Manager Inventory & Operations
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage product catalog, restock quantities, scan barcodes, and configure negative inventory policy
              </p>
            </div>
            <InventoryManager
              inventory={inventory || []}
              stats={stats}
              canAdd={true}
              canDelete={true}
            />
          </div>
        )}

        {/* Tab 4: Sales & Cash Records */}
        {activeTab === "reports" && (
          <div
            key="tab-reports"
            className="animate-in fade-in-50 slide-in-from-bottom-2 duration-200 ease-out fill-mode-both space-y-4"
          >
            <div className="mb-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white drop-shadow-sm">
                Sales & Cash Ledger Audit
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Audit transactions, see exact cash collected from direct sales and customer debt repayments, and manage voids
              </p>
            </div>
            <DailySales canManageSales={true} />
          </div>
        )}

        {/* Tab 5: Customer Debts */}
        {activeTab === "debts" && (
          <div
            key="tab-debts"
            className="animate-in fade-in-50 slide-in-from-bottom-2 duration-200 ease-out fill-mode-both space-y-4"
          >
            <div className="mb-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white drop-shadow-sm">
                Customer Debt Management
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Track outstanding balances, accept installment payments, and generate official payment receipts
              </p>
            </div>
            <DebtManager canDelete={true} />
          </div>
        )}

        {/* Tab 6: Team Management */}
        {activeTab === "team" && (
          <div
            key="tab-team"
            className="animate-in fade-in-50 slide-in-from-bottom-2 duration-200 ease-out fill-mode-both space-y-4"
          >
            <div className="mb-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white drop-shadow-sm">
                Team & User Management
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Verify new cashier accounts, assign roles, toggle product management permissions, and block/unblock access
              </p>
            </div>
            <UserManager users={profiles} />
          </div>
        )}
      </div>

      {/* Mobile-only Floating Cart Bar (md+ uses the sidebar instead) */}
      <div className="md:hidden">
        <FloatingCartBar onOpenFullCart={() => setActiveTab("cart")} />
      </div>

      {/* 1-Tap Back to Top & Quick Data Refresh Pill */}
      <ScrollToTop />
    </div>
  );
}
