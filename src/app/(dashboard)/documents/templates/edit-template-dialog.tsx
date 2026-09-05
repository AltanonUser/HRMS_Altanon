"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTemplateBody } from "@/server/actions/template.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

export function EditTemplateDialog({ templateId, name, htmlBody }: { templateId: string; name: string; htmlBody: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(htmlBody);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateTemplateBody(templateId, value);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Template updated");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline"><Pencil className="h-4 w-4" /> Edit</Button>} />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            HTML with {"{{mergeField}}"} placeholders. The logo, company name, CIN, and address are added automatically — this is only the letter body.
          </DialogDescription>
        </DialogHeader>
        <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={18} className="font-mono text-xs" />
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save template"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
