"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendGeneratedDocument } from "@/server/actions/document.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Send } from "lucide-react";

export function SendDocumentDialog({
  documentId,
  defaultTo,
  defaultSubject,
  defaultMessage,
}: {
  documentId: string;
  defaultTo: string;
  defaultSubject: string;
  defaultMessage: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [toEmail, setToEmail] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);

  const handleSend = async () => {
    setSending(true);
    try {
      const result = await sendGeneratedDocument({ documentId, toEmail, subject, message });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Sent to ${toEmail}`);
      setOpen(false);
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Send className="h-4 w-4" /> Send by Email</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Document</DialogTitle>
          <DialogDescription>
            This sends the PDF as an attachment from your official mailbox. Review the recipient before sending.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="toEmail">To</Label>
            <Input id="toEmail" type="email" value={toEmail} onChange={(e) => setToEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSend} disabled={sending || !toEmail}>
            {sending ? "Sending..." : "Confirm & Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
