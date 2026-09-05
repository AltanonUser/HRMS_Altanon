"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { NAV_SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { PermissionCode } from "@/lib/rbac/permissions";

function Icon({ name, className }: { name: string; className?: string }) {
  const LucideIcon = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <LucideIcon className={className} />;
}

export function SidebarNav({ permissionCodes, onNavigate }: { permissionCodes: PermissionCode[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const permissions = new Set(permissionCodes);

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {NAV_SECTIONS.map((section) => {
        const visibleItems = section.items.filter((item) => !item.permission || permissions.has(item.permission));
        if (visibleItems.length === 0) return null;
        return (
          <div key={section.title} className="mb-5">
            <div className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </div>
            <div className="flex flex-col gap-0.5">
              {visibleItems.map((item) => {
                const active = pathname === item.href.split("?")[0];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ permissionCodes }: { permissionCodes: PermissionCode[] }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
      <div className="flex items-center gap-2 border-b px-5 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="Altanon" className="h-8 w-8 object-contain" />
        <span className="font-semibold">Altanon HRMS</span>
      </div>
      <SidebarNav permissionCodes={permissionCodes} />
    </aside>
  );
}
