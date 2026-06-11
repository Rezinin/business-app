import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShieldX } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  // Check verification and blocked status
  const { data: profile } = await supabase
    .from("profiles")
    .select("verified, role, blocked")
    .eq("id", user.id)
    .single();

  if (profile && profile.blocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 rounded-2xl p-8 max-w-md shadow-xl">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <ShieldX className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-red-700 dark:text-red-400">Account Suspended</h1>
          <p className="text-muted-foreground max-w-md">
            Your account has been temporarily suspended by a manager.
            If you believe this is an error, please contact your administrator.
          </p>
          <div className="mt-6">
            <form action="/auth/signout" method="post">
              <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (profile && !profile.verified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold mb-2">Account Pending Verification</h1>
        <p className="text-muted-foreground max-w-md">
          Your account has been created but requires verification from a manager. 
          Please contact your administrator.
        </p>
        <div className="mt-6">
            <form action="/auth/signout" method="post">
                <button className="text-sm underline">Sign Out</button>
            </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

