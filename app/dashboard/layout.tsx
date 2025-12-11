import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  // Check verification status
  const { data: profile } = await supabase
    .from("profiles")
    .select("verified, role")
    .eq("id", user.id)
    .single();

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
