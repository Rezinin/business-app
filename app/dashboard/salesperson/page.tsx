import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DailySales } from "@/components/daily-sales";
import { ProductGrid } from "@/components/product-grid";
import { DebtManager } from "@/components/debt-manager";
import { InventoryManager } from "@/components/inventory-manager";
import { CartProvider } from "@/lib/cart-context";
import { CartSummary } from "@/components/cart-summary";
import { getAllowNegativeInventory } from "@/lib/inventory-settings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default async function SalespersonDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  // Fetch current user profile to check permissions
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, can_add_products")
    .eq("id", user.id)
    .single();

  // Fetch inventory
  const { data: inventory } = await supabase.from("inventory").select("*");
  const allowNegativeInventory = await getAllowNegativeInventory();

  // Check if user is actually a manager who can view as salesperson
  const isManager = currentProfile?.role === "manager";

  return (
    <CartProvider allowNegativeInventory={allowNegativeInventory}>
      <div className="min-h-screen bg-gradient-to-br from-white via-lime-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative">
      {/* Nature Background Image - Light Mode */}
      <div 
        className="fixed inset-0 z-0 opacity-4 pointer-events-none dark:hidden"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2000&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Nature Background Image - Dark Mode */}
      <div 
        className="fixed inset-0 z-0 opacity-6 pointer-events-none hidden dark:block"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2000&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900/90 dark:backdrop-blur-md border-b border-lime-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-lime-600 to-emerald-600 dark:from-lime-400 dark:to-emerald-400 bg-clip-text text-transparent drop-shadow-md">Sales Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Record and track sales transactions
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="flex-1 md:flex-none bg-lime-600 hover:bg-lime-700 text-white rounded-lg">
                    Manage Debts
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto w-[95vw] md:w-full">
                  <DialogHeader>
                    <DialogTitle>Debt Management</DialogTitle>
                  </DialogHeader>
                  <DebtManager />
                </DialogContent>
              </Dialog>

              {isManager && (
                <Button asChild variant="outline" className="flex-1 md:flex-none border-lime-600 text-lime-700 hover:text-white hover:bg-lime-600 rounded-lg transition-colors">
                  <Link href="/dashboard/manager">View as Manager</Link>
                </Button>
              )}
              <form action="/auth/signout" method="post" className="flex-1 md:flex-none">
                <Button variant="destructive" className="w-full rounded-lg">Sign Out</Button>
              </form>
            </div>
          </div>

          {/* Section Navigation */}
          <nav className="mt-4 -mx-4 md:mx-0 overflow-x-auto" aria-label="Dashboard sections">
            <ul className="flex items-center gap-1 px-4 md:px-0 min-w-max">
              <li>
                <a href="#cart" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 hover:text-lime-700 hover:bg-lime-50 dark:text-gray-200 dark:hover:bg-slate-800 dark:hover:text-lime-400 transition-colors">
                  Cart
                </a>
              </li>
              <li>
                <a href="#products" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 hover:text-lime-700 hover:bg-lime-50 dark:text-gray-200 dark:hover:bg-slate-800 dark:hover:text-lime-400 transition-colors">
                  Products
                </a>
              </li>
              {currentProfile?.can_add_products && (
                <li>
                  <a href="#manage-products" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 hover:text-lime-700 hover:bg-lime-50 dark:text-gray-200 dark:hover:bg-slate-800 dark:hover:text-lime-400 transition-colors">
                    Add Products
                  </a>
                </li>
              )}
              <li>
                <a href="#sales-report" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 hover:text-lime-700 hover:bg-lime-50 dark:text-gray-200 dark:hover:bg-slate-800 dark:hover:text-lime-400 transition-colors">
                  Sales Report
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 relative z-10">
        <div id="cart" className="scroll-mt-48">
          <CartSummary />
        </div>

        <div id="products" className="scroll-mt-48">
          <ProductGrid inventory={inventory || []} />
        </div>

        {currentProfile?.can_add_products && (
          <div id="manage-products" className="border-t-2 border-lime-200 dark:border-slate-700 pt-8 scroll-mt-48">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)] flex items-center gap-2">
                Manage Products
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Add and manage inventory items</p>
            </div>
            <InventoryManager 
              inventory={inventory || []} 
              canAdd={true}
              canDelete={false}
            />
          </div>
        )}

        <div id="sales-report" className="scroll-mt-48">
          <DailySales />
        </div>
      </div>
      </div>
    </CartProvider>
  );
}
