"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar";
import type { PermissionCode } from "@/lib/rbac/permissions";

export function MobileNav({ permissionCodes }: { permissionCodes: PermissionCode[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="Altanon" className="h-7 w-7 object-contain" />
            Altanon HRMS
          </SheetTitle>
        </SheetHeader>
        <SidebarNav permissionCodes={permissionCodes} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
