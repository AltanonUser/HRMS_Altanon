"use server";

import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, AuthenticationError, AuthorizationError } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { renderLetterPdf } from "@/lib/pdf/renderToPdf";
import { LETTER_TYPE_LABELS } from "@/lib/documents/fieldConfig";
import { amountInWords, formatINR } from "@/lib/utils/currency";
import { formatDateIN } from "@/lib/utils/dates";
import { sendMailWithAttachment } from "@/lib/graph/mailer";
import { logAudit } from "@/lib/audit/logger";
import type { ActionResult } from "./auth.actions";
import type { LetterType } from "@prisma/client";

function errorMessage(err: unknown): string {
  if (err instanceof AuthenticationError) return "You must be signed in to do this.";
  if (err instanceof AuthorizationError) return "You do not have permission to do this.";
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

const STORAGE_DIR = path.join(process.cwd(), "storage", "documents");

const DATE_FIELDS = new Set([
  "issueDate", "joiningDate", "startDate", "endDate", "dateOfJoining", "dateOfLeaving", "lastWorkingDay",
  "offerValidityDate",
]);
const CURRENCY_FIELDS = new Set([
  "ctcAnnual",
  "stipendAmount",
  "basicAnnual",
  "hraAnnual",
  "conveyanceAnnual",
  "specialAllowanceAnnual",
  "employerPfAnnual",
]);

export async function generateDocument(params: {
  type: LetterType;
  candidateId?: string | null;
  employeeId?: string | null;
  values: Record<string, string>;
}): Promise<ActionResult & { documentId?: string }> {
  try {
    const session = await requirePermission(PERMISSIONS.DOCUMENT_GENERATE);

    const template = await prisma.documentTemplate.findFirst({ where: { type: params.type, isActive: true } });
    if (!template) return { success: false, error: `No active template found for ${LETTER_TYPE_LABELS[params.type]}.` };

    const company = await prisma.companyProfile.findFirst();
    if (!company) return { success: false, error: "Company profile is not configured yet." };

    const mergeValues: Record<string, string> = { ...params.values };
    for (const key of Object.keys(mergeValues)) {
      if (DATE_FIELDS.has(key) && mergeValues[key]) {
        mergeValues[key] = formatDateIN(mergeValues[key]);
      }
    }
    for (const key of Object.keys(params.values)) {
      if (CURRENCY_FIELDS.has(key) && params.values[key]) {
        const numeric = Number(params.values[key]);
        mergeValues[key] = formatINR(numeric);
        if (key === "ctcAnnual") mergeValues.ctcAnnualWords = amountInWords(numeric);
      }
    }

    await fs.mkdir(STORAGE_DIR, { recursive: true });

    const pdfBuffer = await renderLetterPdf(
      template.htmlBody,
      mergeValues,
      { displayName: company.displayName, legalName: company.legalName, cin: company.cin, registeredAddress: company.registeredAddress, website: company.website },
      LETTER_TYPE_LABELS[params.type]
    );

    const doc = await prisma.generatedDocument.create({
      data: {
        templateId: template.id,
        templateVersion: template.version,
        type: params.type,
        employeeId: params.employeeId || null,
        candidateId: params.candidateId || null,
        mergeFieldValues: params.values,
        status: "GENERATED",
        generatedById: session.id,
      },
    });

    const pdfPath = path.join(STORAGE_DIR, `${doc.id}.pdf`);
    await fs.writeFile(pdfPath, pdfBuffer);
    await prisma.generatedDocument.update({ where: { id: doc.id }, data: { pdfPath } });

    await logAudit({ actorUserId: session.id, action: "GENERATE", entityType: "GeneratedDocument", entityId: doc.id, after: { type: params.type } });
    revalidatePath("/documents");
    return { success: true, documentId: doc.id };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function sendGeneratedDocument(params: {
  documentId: string;
  toEmail: string;
  ccEmails?: string[];
  subject: string;
  message: string;
}): Promise<ActionResult> {
  try {
    const session = await requirePermission(PERMISSIONS.DOCUMENT_SEND);

    const doc = await prisma.generatedDocument.findUnique({ where: { id: params.documentId } });
    if (!doc || !doc.pdfPath) return { success: false, error: "Document not found or not yet generated." };

    const pdfBuffer = await fs.readFile(doc.pdfPath);
    const fileName = `${LETTER_TYPE_LABELS[doc.type]}.pdf`.replace(/\s+/g, "_");

    const result = await sendMailWithAttachment({
      to: params.toEmail,
      cc: params.ccEmails,
      subject: params.subject,
      htmlBody: `<p>${params.message.replace(/\n/g, "<br/>")}</p>`,
      attachment: { fileName, contentBytes: pdfBuffer.toString("base64"), contentType: "application/pdf" },
    });

    const emailLog = await prisma.emailLog.create({
      data: {
        generatedDocumentId: doc.id,
        toEmail: params.toEmail,
        ccEmails: params.ccEmails ?? [],
        subject: params.subject,
        status: result.ok ? "SENT" : "FAILED",
        errorMessage: result.ok ? null : result.error,
        attempts: 1,
        sentById: session.id,
        sentAt: result.ok ? new Date() : null,
      },
    });

    if (result.ok) {
      await prisma.generatedDocument.update({ where: { id: doc.id }, data: { status: "SENT" } });
    } else {
      await prisma.generatedDocument.update({ where: { id: doc.id }, data: { status: "FAILED" } });
    }

    await logAudit({
      actorUserId: session.id,
      action: "SEND_MAIL",
      entityType: "GeneratedDocument",
      entityId: doc.id,
      after: { emailLogId: emailLog.id, status: result.ok ? "SENT" : "FAILED" },
    });
    revalidatePath("/documents");
    revalidatePath(`/documents/${doc.id}`);

    if (!result.ok) return { success: false, error: result.error };
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}
