import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DailySales } from "@/components/daily-sales";
import { ProductGrid } from "@/components/product-grid";
import { DebtManager } from "@/components/debt-manager";
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

  // Fetch inventory
  const { data: inventory } = await supabase.from("inventory").select("*");

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
        <h1 className="text-2xl md:text-3xl font-bold">Sales Dashboard</h1>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1 md:flex-none">Manage Debts</Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto w-[95vw] md:w-full">
                    <DialogHeader>
                        <DialogTitle>Debt Management</DialogTitle>
                    </DialogHeader>
                    <DebtManager />
                </DialogContent>
            </Dialog>

             <Button asChild variant="outline" className="flex-1 md:flex-none">
                <Link href="/dashboard/manager">View as Manager</Link>
            </Button>
            <form action="/auth/signout" method="post" className="flex-1 md:flex-none">
                <Button variant="destructive" className="w-full">Sign Out</Button>
            </form>
        </div>
      </div>

      <ProductGrid inventory={inventory || []} />

      <div className="mt-8">
        <DailySales />
      </div>
    </div>
  );
}
