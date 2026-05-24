import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-white via-lime-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
      {/* Nature Background Image - Light Mode */}
      <div 
        className="fixed inset-0 z-0 opacity-3 pointer-events-none dark:hidden"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2000&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Nature Background Image - Dark Mode */}
      <div 
        className="fixed inset-0 z-0 opacity-5 pointer-events-none hidden dark:block"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1505228395891-9a51e7e86e81?q=80&w=2000&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Thank you for signing up!
              </CardTitle>
              <CardDescription>Check your email to confirm</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You&apos;ve successfully signed up. Please check your email to
                confirm your account.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                <strong>Note:</strong> After confirming your email, your account will be pending verification by a manager. You will not be able to access the dashboard until verified.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
