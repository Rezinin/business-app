import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CartProvider } from "@/lib/cart-context";
import { getAllowNegativeInventory } from "@/lib/inventory-settings";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { OfflineBanner } from "@/components/offline-banner";
import { HeaderCartPill } from "@/components/header-cart-pill";
import { SalespersonDashboardStack } from "@/components/salesperson-dashboard-stack";

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
    .select("*")
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
        
        {/* Top Header */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-lime-100 dark:border-slate-800 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 sm:py-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-lime-600 to-emerald-600 dark:from-lime-400 dark:to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">
                  Sales Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Welcome, <span className="font-semibold text-lime-700 dark:text-lime-400">{currentProfile?.full_name || "Salesperson"}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <OfflineBanner />
                <HeaderCartPill />

                {isManager && (
                  <Button asChild variant="outline" className="border-lime-600 text-lime-700 hover:text-white hover:bg-lime-600 rounded-lg text-xs sm:text-sm h-9">
                    <Link href="/dashboard/manager">View as Manager</Link>
                  </Button>
                )}

                <ThemeSwitcher />

                <form action="/auth/signout" method="post" className="inline-block">
                  <Button variant="destructive" className="rounded-lg text-xs sm:text-sm h-9">Sign Out</Button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Main Stacked Dashboard Body */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 relative z-10">
          <SalespersonDashboardStack
            inventory={inventory || []}
            canAddProducts={Boolean(currentProfile?.can_add_products)}
            canPairBarcodes={Boolean(currentProfile?.can_pair_barcodes || isManager)}
            isManager={isManager}
            userId={user.id}
          />
        </div>
      </div>
    </CartProvider>
  );
}
