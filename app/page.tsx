import { createClient } from "@/lib/supabase/server";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted">
      <div className="flex-1 w-full flex flex-col items-center justify-center gap-10 px-4 text-center">
        
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
            Hajia Salima's Collection
          </h1>
          <p className="text-xl text-muted-foreground max-w-[600px] mx-auto">
            Premium Inventory & Sales Management System
          </p>
        </div>

        <div className="flex flex-col gap-4 min-w-[200px]">
          {user ? (
            <div className="flex flex-col gap-4 items-center">
              <p className="text-sm text-muted-foreground">
                Welcome back, {user.email}
              </p>
              <Button asChild size="lg" className="w-full md:w-auto text-lg px-8">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row justify-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href="/auth/sign-up">Create Account</Link>
              </Button>
            </div>
          )}
        </div>

      </div>

      <footer className="w-full py-6 flex items-center justify-center border-t text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <p>&copy; {new Date().getFullYear()} Hajia Salima's Collection</p>
          <ThemeSwitcher />
        </div>
      </footer>
    </main>
  );
}

