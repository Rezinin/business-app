import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-white via-lime-50 to-white relative overflow-hidden">
      {/* Nature Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-3 pointer-events-none"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2000&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      <div className="w-full max-w-sm relative z-10">
        <LoginForm />
      </div>
    </div>
  );
}
