import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { InventoryManager } from "@/components/inventory-manager";
import { UserManager } from "@/components/user-manager";
import { DailySales } from "@/components/daily-sales";
import { DebtManager } from "@/components/debt-manager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  if (currentProfile?.role === 'salesperson') {
      return redirect("/dashboard/salesperson");
  }

  // Fetch inventory
  const { data: inventory } = await supabase.from("inventory").select("*").order('created_at', { ascending: false });
  
  // Fetch users (profiles) - fetch all except current user
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .neq('id', user.id);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
  }

  const sortedProfiles = profiles?.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "")) || [];

  // Calculate stats
  const productCount = inventory?.length || 0;
  const lowStockCount = inventory?.filter((i) => i.quantity < 10).length || 0;
  const totalValue = inventory?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;
  const pendingUsersCount = sortedProfiles.filter((p) => !p.verified).length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-lime-50 to-white relative">
      {/* Nature Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-4 pointer-events-none"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2000&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Header */}
      <div className="bg-white border-b border-lime-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Manager Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome, <span className="font-semibold text-lime-700">{currentProfile?.full_name}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className={`flex-1 md:flex-none bg-lime-600 hover:bg-lime-700 text-white rounded-lg ${pendingUsersCount > 0 ? "ring-2 ring-red-400" : ""}`}>
                    Manage Users
                    {pendingUsersCount > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {pendingUsersCount}
                      </span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto w-[95vw] md:w-full">
                  <DialogHeader>
                    <DialogTitle>User Management</DialogTitle>
                  </DialogHeader>
                  <UserManager users={sortedProfiles} />
                </DialogContent>
              </Dialog>

              <Button asChild variant="outline" className="flex-1 md:flex-none border-lime-600 text-lime-700 hover:text-white hover:bg-lime-600 rounded-lg transition-colors">
                <Link href="/dashboard/salesperson">View as Salesperson</Link>
              </Button>
              <form action="/auth/signout" method="post" className="flex-1 md:flex-none">
                <Button variant="destructive" className="w-full rounded-lg">Sign Out</Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 relative z-10">
        {/* Stats Row */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-white border-0 shadow-md rounded-xl hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-lime-700">{productCount}</div>
              <p className="text-xs text-gray-500 mt-1">in inventory</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-xl hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Low Stock Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-orange-600">{lowStockCount}</div>
              <p className="text-xs text-gray-500 mt-1">items with &lt; 10 qty</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-xl hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-lime-700">₵{totalValue.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">inventory value</p>
            </CardContent>
          </Card>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          <InventoryManager inventory={inventory || []} />
        </div>

        <DailySales />

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Debt Management</h2>
          <DebtManager canDelete={true} />
        </div>
      </div>
    </div>
  );
}
