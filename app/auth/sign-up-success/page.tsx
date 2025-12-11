import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
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
