import "server-only";
import puppeteer, { type Browser } from "puppeteer";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";

let browserPromise: Promise<Browser> | null = null;

/** Launches a single shared Chromium instance, reused across every PDF render in this process
 * (a payroll run can generate dozens of payslips — spawning a fresh browser per document is slow). */
function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserPromise;
}

let logoDataUri: string | null = null;
function getLogoDataUri(): string {
  if (logoDataUri) return logoDataUri;
  const logoPath = path.join(process.cwd(), "public", "brand", "logo.png");
  const png = fs.readFileSync(logoPath);
  logoDataUri = `data:image/png;base64,${png.toString("base64")}`;
  return logoDataUri;
}

// 1x1 transparent pixel — used if the signature asset isn't present, so letters still render
// (with a blank signature line) instead of showing a broken-image icon.
const BLANK_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

let signatureDataUri: string | null = null;
function getSignatureDataUri(): string {
  if (signatureDataUri) return signatureDataUri;
  const signaturePath = path.join(process.cwd(), "public", "brand", "signature-sandhya-nehe.png");
  try {
    const png = fs.readFileSync(signaturePath);
    signatureDataUri = `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    signatureDataUri = BLANK_PIXEL;
  }
  return signatureDataUri;
}

export type CompanyBranding = {
  displayName: string;
  legalName: string;
  cin?: string | null;
  registeredAddress: string;
  website?: string | null;
};

const BASE_STYLES = `
  @page { size: A4; margin: 22mm 18mm 20mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11.5pt;
    color: #1a1a2e;
    line-height: 1.55;
  }
  .letterhead {
    display: flex;
    align-items: center;
    gap: 14px;
    border-bottom: 2px solid #1447e6;
    padding-bottom: 10px;
    margin-bottom: 22px;
  }
  .letterhead img { width: 42px; height: 42px; object-fit: contain; }
  .letterhead .company-name { font-size: 16pt; font-weight: 700; color: #1447e6; }
  .letterhead .company-sub { font-size: 8.5pt; color: #555; margin-top: 2px; }
  .doc-title {
    text-align: center;
    font-size: 13pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 4px 0 20px;
  }
  p { margin: 0 0 10px; }
  p.date { text-align: right; color: #444; }
  h3.clause { font-size: 11pt; margin: 16px 0 4px; }
  ul.doc-list { margin: 0 0 10px; padding-left: 20px; }
  ul.doc-list li { margin-bottom: 3px; }
  p.signoff { margin-top: 26px; page-break-inside: avoid; }
  .signature-img { height: 44px; object-fit: contain; display: block; margin: 6px 0 2px; }
  table.kv { width: 100%; border-collapse: collapse; margin: 14px 0; }
  table.kv td { padding: 5px 8px; border: 1px solid #dfe3ea; font-size: 10.8pt; }
  table.kv td:first-child { width: 40%; background: #f5f7fb; font-weight: 600; }
  table.data { width: 100%; border-collapse: collapse; font-size: 10pt; page-break-inside: avoid; }
  table.data th, table.data td { padding: 6px 8px; border: 1px solid #dfe3ea; text-align: left; }
  table.data th { background: #1447e6; color: #fff; font-weight: 600; }
  table.data tr:nth-child(even) td { background: #f8fafc; }
  table.data .num { text-align: right; font-variant-numeric: tabular-nums; }
  .disclaimer {
    margin-top: 18px;
    padding: 10px 12px;
    background: #fff7ed;
    border: 1px solid #fdba74;
    border-radius: 4px;
    font-size: 9pt;
    color: #7c2d12;
  }
`;

function shellHtml(bodyHtml: string, branding: CompanyBranding, docTitle?: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>${BASE_STYLES}</style>
</head>
<body>
  <div class="letterhead">
    <img src="${getLogoDataUri()}" alt="logo" />
    <div>
      <div class="company-name">${branding.displayName}</div>
      <div class="company-sub">${branding.legalName}${branding.cin ? ` &nbsp;|&nbsp; CIN: ${branding.cin}` : ""}</div>
      <div class="company-sub">${branding.registeredAddress}</div>
    </div>
  </div>
  ${docTitle ? `<div class="doc-title">${docTitle}</div>` : ""}
  ${bodyHtml}
</body>
</html>`;
}

// Puppeteer renders header/footer templates in their own isolated iframe — the page's <style> block
// isn't visible there, so this needs fully inline styles. Using Puppeteer's native footer (rather than
// a `position: fixed` element in the body) avoids it colliding with body text on multi-page documents,
// since Puppeteer reserves the page's bottom margin for it instead of overlaying it on the content area.
function footerTemplateHtml(branding: CompanyBranding): string {
  const text = `${branding.legalName}${branding.cin ? ` — CIN ${branding.cin}` : ""}${branding.website ? ` — ${branding.website}` : ""}`;
  return `<div style="width: 100%; font-size: 7.5pt; color: #777; text-align: center; border-top: 1px solid #e2e6ee; padding: 4px 18mm 0; margin: 0 0mm;">${text}</div>`;
}

// Runs on every page (unlike the big in-body letterhead, which only appears once at the top of
// page 1) — a small persistent brand mark so continuation pages aren't blank at the top, matching
// how most multi-page company letterheads repeat the logo on every sheet.
function headerTemplateHtml(branding: CompanyBranding): string {
  return `<div style="width: 100%; display: flex; align-items: center; gap: 6px; font-size: 8pt; color: #555; padding: 0 18mm; margin: 0;">
    <img src="${getLogoDataUri()}" alt="" style="height: 14px; object-fit: contain;" />
    <span style="font-weight: 600; color: #1447e6;">${branding.displayName}</span>
  </div>`;
}

/** Replaces {{key}} placeholders in a template string with values (missing keys render as blank, not left dangling). */
export function mergeFields(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}

async function htmlToPdfBuffer(html: string, branding: CompanyBranding): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    const base = {
      format: "A4" as const,
      printBackground: true,
      margin: { top: "22mm", bottom: "20mm", left: "18mm", right: "18mm" },
      displayHeaderFooter: true,
      footerTemplate: footerTemplateHtml(branding),
    };
    // Page 1 already carries the full in-body letterhead (logo, name, CIN, address) — repeating the
    // small header there too would just duplicate it. Continuation pages have no other brand mark,
    // so they get the small header. Puppeteer applies one header per render, so we render the same
    // content twice (identical pagination either way, since the header's reserved margin height is
    // the same in both cases — only what's drawn inside it differs) and splice page 1 from the
    // "no header" pass onto the rest of the "with header" pass.
    const [noHeaderBytes, withHeaderBytes] = [
      await page.pdf({ ...base, headerTemplate: "<div></div>" }),
      await page.pdf({ ...base, headerTemplate: headerTemplateHtml(branding) }),
    ];

    const noHeaderDoc = await PDFDocument.load(noHeaderBytes);
    const withHeaderDoc = await PDFDocument.load(withHeaderBytes);
    const finalDoc = await PDFDocument.create();

    const [firstPage] = await finalDoc.copyPages(noHeaderDoc, [0]);
    finalDoc.addPage(firstPage);

    const totalPages = withHeaderDoc.getPageCount();
    if (totalPages > 1) {
      const restIndices = Array.from({ length: totalPages - 1 }, (_, i) => i + 1);
      const restPages = await finalDoc.copyPages(withHeaderDoc, restIndices);
      restPages.forEach((p) => finalDoc.addPage(p));
    }

    return Buffer.from(await finalDoc.save());
  } finally {
    await page.close();
  }
}

export async function renderLetterPdf(
  templateHtml: string,
  mergeValues: Record<string, string>,
  branding: CompanyBranding,
  docTitle: string
): Promise<Buffer> {
  // signatureImg is always injected here (not passed by callers) — it's a fixed company asset,
  // the same on every letter, not something a per-document form field should control.
  const merged = mergeFields(templateHtml, { ...mergeValues, signatureImg: getSignatureDataUri() });
  return htmlToPdfBuffer(shellHtml(merged, branding, docTitle), branding);
}

export async function renderCustomPdf(
  bodyHtml: string,
  branding: CompanyBranding,
  docTitle: string
): Promise<Buffer> {
  return htmlToPdfBuffer(shellHtml(bodyHtml, branding, docTitle), branding);
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}
