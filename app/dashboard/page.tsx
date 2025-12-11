import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "manager") {
    return redirect("/dashboard/manager");
  } else if (profile?.role === "salesperson") {
    return redirect("/dashboard/salesperson");
  } else {
    // Treat users with no role as Developers/Managers
    return redirect("/dashboard/manager");
  }
}
