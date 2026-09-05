"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { uploadForm16PartA } from "@/server/actions/form16.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Upload } from "lucide-react";

export function UploadPartADialog({ recordId }: { recordId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Select a PDF file.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadForm16PartA(recordId, formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Part A uploaded and merged");
      setOpen(false);
      router.refresh();
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline"><Upload className="h-4 w-4" /> Upload Part A</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Form 16 Part A</DialogTitle>
          <DialogDescription>Upload the genuine Part A PDF downloaded from TRACES. It will be merged with the generated Part B.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="partA">Part A PDF</Label>
          <Input id="partA" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <DialogFooter>
          <Button onClick={handleUpload} disabled={uploading}>{uploading ? "Uploading..." : "Upload & Merge"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
