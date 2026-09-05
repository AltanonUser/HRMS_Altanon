import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">
            {session.mustChangePassword ? "Set a new password" : "Change password"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {session.mustChangePassword
              ? "For security, you must set your own password before continuing."
              : "Update the password for your account."}
          </p>
        </div>
        <ChangePasswordForm forced={session.mustChangePassword} />
      </div>
    </div>
  );
}
