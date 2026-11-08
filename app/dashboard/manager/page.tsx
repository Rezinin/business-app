import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CartProvider } from "@/lib/cart-context";
import { getAllowNegativeInventory } from "@/lib/inventory-settings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { OfflineBanner } from "@/components/offline-banner";
import { ReceiptHistory } from "@/components/receipt-history";
import { HeaderCartPill } from "@/components/header-cart-pill";
import { ManagerDashboardStack } from "@/components/manager-dashboard-stack";

export default async function ManagerDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  // Fetch current user profile
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Protect the route: Redirect salespersons to their dashboard
  if (currentProfile?.role === "salesperson") {
    return redirect("/dashboard/salesperson");
  }

  // Fetch inventory
  const { data: inventory } = await supabase
    .from("inventory")
    .select("*")
    .order("created_at", { ascending: false });
  const allowNegativeInventory = await getAllowNegativeInventory();

  // Fetch users (profiles) - fetch all except current user
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", user.id);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
  }

  const sortedProfiles =
    profiles?.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "")) || [];

  // Calculate stats
  const productCount = inventory?.length || 0;
  const lowStockCount = inventory?.filter((i) => i.quantity < 10).length || 0;
  const totalValue =
    inventory?.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0;
  const pendingUsersCount = sortedProfiles.filter((p) => !p.verified).length || 0;

  return (
    <CartProvider allowNegativeInventory={allowNegativeInventory}>
      <div
        className="min-h-screen bg-gradient-to-br from-white via-lime-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative"
        suppressHydrationWarning
      >
        {/* Nature Background Image - Light Mode */}
        <div
          className="fixed inset-0 z-0 opacity-4 pointer-events-none dark:hidden"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2000&auto=format&fit=crop")',
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {/* Nature Background Image - Dark Mode */}
        <div
          className="fixed inset-0 z-0 opacity-6 pointer-events-none hidden dark:block"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1505228395891-9a51e7e86e81?q=80&w=2000&auto=format&fit=crop")',
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Header */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-lime-100 dark:border-slate-800 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 sm:py-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-lime-600 to-emerald-600 dark:from-lime-400 dark:to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">
                  Manager Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Welcome,{" "}
                  <span className="font-semibold text-lime-700 dark:text-lime-400">
                    {currentProfile?.full_name}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <OfflineBanner />
                <HeaderCartPill />

                {/* Receipt History & Audit Log Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-lime-600 text-lime-700 hover:text-white hover:bg-lime-600 rounded-lg text-xs sm:text-sm h-9 transition-colors"
                    >
                      Receipt History
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto w-[95vw] md:w-full">
                    <DialogHeader>
                      <DialogTitle>Receipt History & Audit</DialogTitle>
                    </DialogHeader>
                    <ReceiptHistory limit={30} />
                  </DialogContent>
                </Dialog>

                <Button
                  asChild
                  variant="outline"
                  className="border-lime-600 text-lime-700 hover:text-white hover:bg-lime-600 rounded-lg text-xs sm:text-sm h-9 transition-colors"
                >
                  <Link href="/dashboard/salesperson">View as Salesperson</Link>
                </Button>

                <ThemeSwitcher />

                <form action="/auth/signout" method="post" className="inline-block">
                  <Button variant="destructive" className="rounded-lg text-xs sm:text-sm h-9">
                    Sign Out
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Main Stacked Dashboard Body */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 relative z-10">
          <ManagerDashboardStack
            inventory={inventory || []}
            profiles={sortedProfiles}
            stats={{ productCount, lowStockCount, totalValue }}
            pendingUsersCount={pendingUsersCount}
          />
        </div>
      </div>
    </CartProvider>
  );
}
