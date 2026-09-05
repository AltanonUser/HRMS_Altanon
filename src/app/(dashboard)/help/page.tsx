import * as Icons from "lucide-react";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GUIDE_SECTIONS } from "@/lib/help/guideContent";

function Icon({ name, className }: { name: string; className?: string }) {
  const LucideIcon = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <LucideIcon className={className} />;
}

export default async function HelpPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">User Guide</h1>
        <p className="text-sm text-muted-foreground">
          A step-by-step walkthrough of every process in Altanon HRMS. This page is read-only —
          it's maintained by the system, not editable here.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-2 pt-6">
          {GUIDE_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon name={section.icon} className="h-3.5 w-3.5" />
              {section.title}
            </a>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-5">
        {GUIDE_SECTIONS.map((section) => (
          <Card key={section.id} id={section.id} className="scroll-mt-6">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon name={section.icon} className="h-4 w-4" />
                </div>
                <CardTitle className="text-base">{section.title}</CardTitle>
              </div>
              <Badge variant="outline" className="shrink-0 whitespace-normal text-right">
                {section.whoFor}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ol className="flex flex-col gap-2">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="text-foreground/90">{step}</span>
                  </li>
                ))}
              </ol>
              {section.tip && (
                <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-900 dark:text-amber-200">
                  <Icons.Lightbulb className="h-3.5 w-3.5 shrink-0 translate-y-0.5" />
                  <span>{section.tip}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
