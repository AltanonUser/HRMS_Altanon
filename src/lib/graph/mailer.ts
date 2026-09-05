import "server-only";
import { getGraphAccessToken, isGraphConfigured } from "./client";

export type SendMailAttachment = {
  fileName: string;
  contentBytes: string; // base64
  contentType?: string;
};

export type SendMailResult = { ok: true } | { ok: false; error: string };

/**
 * Sends mail via POST /users/{mailbox}/sendMail as the shared official mailbox (application
 * permissions). Graph returns 202 Accepted, which only means Microsoft accepted the message for
 * delivery — not that it reached the inbox or was read. There is no delivered/opened webhook in
 * this simple flow; see the plan's caveat on this.
 */
export async function sendMailWithAttachment(params: {
  to: string;
  cc?: string[];
  subject: string;
  htmlBody: string;
  attachment: SendMailAttachment;
}): Promise<SendMailResult> {
  if (!isGraphConfigured()) {
    return {
      ok: false,
      error:
        "Microsoft Graph mail is not configured yet. Ask your Microsoft 365 admin to complete the Azure AD " +
        "app registration (Azure AD app + Mail.Send application permission) and set the AZURE_* env vars.",
    };
  }

  const mailbox = process.env.MAIL_SENDER_ADDRESS;
  if (!mailbox) return { ok: false, error: "MAIL_SENDER_ADDRESS is not set." };

  try {
    const token = await getGraphAccessToken();
    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/sendMail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: params.subject,
          body: { contentType: "HTML", content: params.htmlBody },
          toRecipients: [{ emailAddress: { address: params.to } }],
          ccRecipients: (params.cc ?? []).map((email) => ({ emailAddress: { address: email } })),
          attachments: [
            {
              "@odata.type": "#microsoft.graph.fileAttachment",
              name: params.attachment.fileName,
              contentType: params.attachment.contentType ?? "application/pdf",
              contentBytes: params.attachment.contentBytes,
            },
          ],
        },
        saveToSentItems: true,
      }),
    });

    if (res.status === 202) return { ok: true };

    const body = await res.text().catch(() => "");
    return { ok: false, error: `Graph sendMail failed (${res.status}): ${body.slice(0, 500)}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error sending mail." };
  }
}
