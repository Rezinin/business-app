import { createClient } from "@/lib/supabase/server";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart3, Package, Zap } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-lime-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Background Image - Light Mode */}
      <div 
        className="fixed inset-0 z-0 opacity-5 pointer-events-none dark:hidden"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2000&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Hero Background Image - Dark Mode */}
      <div 
        className="fixed inset-0 z-0 opacity-6 pointer-events-none hidden dark:block"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1505228395891-9a51e7e86e81?q=80&w=2000&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Header/Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-lime-100 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-lime-500 to-lime-600 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-lime-700">Rezinin</h1>
              <p className="text-xs text-lime-600">Enterprise</p>
            </div>
          </div>
          <ThemeSwitcher />
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-6xl md:text-7xl font-bold text-gray-900">
              <span className="bg-gradient-to-r from-lime-600 to-lime-500 bg-clip-text text-transparent">
                Rezinin Enterprise
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Professional Inventory & Sales Management System designed for modern businesses
            </p>
          </div>

          {/* CTA Buttons */}
          {user ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-gray-600">
                Welcome back, <span className="font-semibold text-lime-700">{user.email}</span>
              </p>
              <Button size="lg" className="bg-gradient-to-r from-lime-600 to-lime-500 hover:from-lime-700 hover:to-lime-600 text-white rounded-xl px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild className="bg-gradient-to-r from-lime-600 to-lime-500 hover:from-lime-700 hover:to-lime-600 text-white rounded-xl px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all">
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button size="lg" asChild variant="outline" className="border-2 border-lime-600 text-lime-600 hover:bg-lime-50 rounded-xl px-8 py-6 text-lg font-semibold">
                <Link href="/auth/sign-up">Create Account</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-gradient-to-br from-lime-50 to-transparent dark:from-slate-800/50 dark:to-transparent">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-center text-4xl font-bold bg-gradient-to-r from-lime-600 to-emerald-600 dark:from-lime-400 dark:to-emerald-400 bg-clip-text text-transparent mb-16">
            ✨ Powerful Features
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border-l-4 border-lime-500">
              <div className="w-12 h-12 rounded-lg bg-lime-100 flex items-center justify-center mb-6">
                <Package className="w-6 h-6 text-lime-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Inventory Management</h4>
              <p className="text-gray-600">
                Real-time tracking of products, stock levels, and pricing with instant updates across all views
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border-l-4 border-lime-500">
              <div className="w-12 h-12 rounded-lg bg-lime-100 flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6 text-lime-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Sales Tracking</h4>
              <p className="text-gray-600">
                Track daily sales, manage credit transactions, and generate comprehensive reports
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border-l-4 border-lime-500">
              <div className="w-12 h-12 rounded-lg bg-lime-100 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-lime-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Role-Based Access</h4>
              <p className="text-gray-600">
                Separate dashboards for managers and salespersons with customized permissions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-lime-100 dark:border-slate-700 bg-gradient-to-b from-white dark:from-slate-800 to-lime-50 dark:to-slate-900 py-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-gray-600 dark:text-gray-400">
            &copy; {new Date().getFullYear()} Rezinin Enterprise. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

