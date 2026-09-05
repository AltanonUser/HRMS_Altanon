"use client";

import Link from "next/link";
import { ShieldAlert, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isAuthorizationError = error.message === "You do not have permission to do this.";

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
          {isAuthorizationError ? (
            <ShieldAlert className="h-10 w-10 text-muted-foreground" />
          ) : (
            <TriangleAlert className="h-10 w-10 text-destructive" />
          )}
          <div>
            <h1 className="text-lg font-semibold">{isAuthorizationError ? "Access denied" : "Something went wrong"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAuthorizationError
                ? "You don't have permission to view this page. If you think this is a mistake, ask an admin to update your role."
                : "An unexpected error occurred while loading this page."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/dashboard" />} nativeButton={false}>
              Back to Dashboard
            </Button>
            {!isAuthorizationError && <Button onClick={reset}>Try again</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
