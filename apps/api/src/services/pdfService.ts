import PDFDocument from "pdfkit";
import type { BusinessSettings } from "@bandhan/shared";
import { LINE_ITEM_CATEGORY_LABELS } from "@bandhan/shared";
import { settingService } from "@/services/settingService";
import { formatPaise, toRupees } from "@/utils/money";

/**
 * ---------------------------------------------------------------------------
 * PDF RENDERING
 * ---------------------------------------------------------------------------
 * Real server-side PDFs, generated with PDFKit — not a browser print dialog.
 * The bytes are produced here and stored by `documentService`, so the customer
 * receives an actual file with a stable number on it.
 *
 * Layout notes:
 *   - Times for headings and Helvetica for figures, mirroring the site's
 *     serif/sans pairing with the two font families PDFKit ships.
 *   - Deep forest green (#17251D) for text, antique gold (#B08A45) for rules.
 *   - The figures column is right-aligned and monospaced in effect, so a
 *     customer can add the rows up by eye and reach the printed total.
 *
 * Every amount is passed in **paise** and formatted once, here.
 */

const FOREST = "#17251D";
const GOLD = "#B08A45";
const MUTED = "#6B6F68";
const IVORY = "#F7F3EA";

const PAGE_MARGIN = 46;

interface Brand {
  name: string;
  tagline: string;
  contactLines: string[];
  addressLines: string[];
}

async function loadBrand(): Promise<Brand> {
  let settings: BusinessSettings;
  try {
    settings = await settingService.getBusinessSettings();
  } catch {
    // A settings read must never stop a document being produced.
    settings = {
      brand: { name: "Bandhan Events", tagline: "Celebrations for a Lifetime" },
      contact: { phoneDisplay: "", whatsappNumber: "", email: "", instagramUrl: "", instagramHandle: "" },
      address: { street: "", locality: "", area: "", city: "", postalCode: "", state: "", country: "" },
      onlinePresence: { googleBusinessUrl: "", justdialUrl: "" },
      internal: { enquiryNotifyEmail: "" },
    };
  }

  const { brand, contact, address } = settings;

  const contactLines = [
    contact.phoneDisplay && contact.phoneDisplay !== "Coming Soon" ? `Phone: ${contact.phoneDisplay}` : "",
    contact.email && contact.email !== "Coming Soon" ? contact.email : "",
    contact.instagramHandle || "",
  ].filter(Boolean);

  const addressLines = [
    address.street,
    [address.locality, address.area].filter(Boolean).join(", "),
    [address.city, address.state, address.postalCode].filter(Boolean).join(" "),
  ].filter((line) => Boolean(line && line.trim()));

  return {
    name: brand.name || "Bandhan Events",
    tagline: brand.tagline || "",
    contactLines,
    addressLines,
  };
}

// ── Number to words (Indian numbering) ───────────────────────────────────────

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(value: number): string {
  if (value < 20) return ONES[value];
  return `${TENS[Math.floor(value / 10)]}${value % 10 ? ` ${ONES[value % 10]}` : ""}`;
}

/** Indian groups: crore, lakh, thousand, hundred, tens. */
function rupeesInWords(paise: number): string {
  const rupees = Math.floor(toRupees(paise));
  const paiseRemainder = Math.round(toRupees(paise) * 100) % 100;

  if (rupees === 0 && paiseRemainder === 0) return "Zero rupees only";

  const groups: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = Math.floor((rupees % 1000) / 100);
  const rest = rupees % 100;

  if (crore) groups.push(`${twoDigits(crore)} Crore`);
  if (lakh) groups.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) groups.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) groups.push(`${ONES[hundred]} Hundred`);
  if (rest) groups.push(twoDigits(rest));

  const rupeeWords = groups.join(" ") || "Zero";
  const paiseWords = paiseRemainder ? ` and ${twoDigits(paiseRemainder)} Paise` : "";
  return `${rupeeWords} Rupees${paiseWords} Only`;
}

// ── Shared drawing helpers ───────────────────────────────────────────────────

function money(value: string | number): string {
  return formatPaise(typeof value === "string" ? Number(value) : value);
}

function drawBrandHeader(doc: PDFKit.PDFDocument, brand: Brand) {
  const pageWidth = doc.page.width;
  let y = PAGE_MARGIN;

  doc.fillColor(FOREST).font("Times-Bold").fontSize(20).text(brand.name, PAGE_MARGIN, y);
  y += 22;

  if (brand.tagline) {
    doc.fillColor(GOLD).font("Helvetica").fontSize(8.5).text(brand.tagline.toUpperCase(), PAGE_MARGIN, y, {
      characterSpacing: 1.4,
    });
    y += 12;
  }

  const blockX = pageWidth / 2;
  const blockWidth = pageWidth / 2 - PAGE_MARGIN;
  let blockY = PAGE_MARGIN;

  doc.fillColor(MUTED).font("Helvetica").fontSize(8.5);
  for (const line of brand.addressLines) {
    doc.text(line, blockX, blockY, { width: blockWidth, align: "right" });
    blockY += 11;
  }
  for (const line of brand.contactLines) {
    doc.text(line, blockX, blockY, { width: blockWidth, align: "right" });
    blockY += 11;
  }

  const ruleY = Math.max(y, blockY) + 6;
  doc.moveTo(PAGE_MARGIN, ruleY).lineTo(pageWidth - PAGE_MARGIN, ruleY).lineWidth(1).strokeColor(GOLD).stroke();

  return ruleY + 16;
}

interface MetaPair {
  label: string;
  value: string;
}

function drawDocumentMeta(
  doc: PDFKit.PDFDocument,
  title: string,
  meta: MetaPair[],
  startY: number
) {
  const pageWidth = doc.page.width;

  doc.fillColor(FOREST).font("Times-Bold").fontSize(15).text(title, PAGE_MARGIN, startY, {
    width: (pageWidth - PAGE_MARGIN * 2) / 2,
  });

  const metaX = pageWidth / 2;
  const metaWidth = pageWidth / 2 - PAGE_MARGIN;
  let y = startY - 2;

  for (const pair of meta) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(pair.label.toUpperCase(), metaX, y, {
      width: metaWidth,
      align: "right",
      characterSpacing: 0.6,
    });
    y += 9.5;
    doc.fillColor(FOREST).font("Helvetica-Bold").fontSize(9.5).text(pair.value, metaX, y, {
      width: metaWidth,
      align: "right",
    });
    y += 13;
  }

  return Math.max(startY + 26, y) + 6;
}

function drawInfoBox(
  doc: PDFKit.PDFDocument,
  heading: string,
  lines: string[],
  x: number,
  y: number,
  width: number
): number {
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7.5).text(heading.toUpperCase(), x, y, {
    width,
    characterSpacing: 1,
  });

  let cursor = y + 12;
  doc.fillColor(FOREST).font("Helvetica").fontSize(9);
  for (const line of lines.filter(Boolean)) {
    doc.text(line, x, cursor, { width, lineGap: 1 });
    cursor = doc.y + 2;
  }

  return cursor;
}

interface TableRow {
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unitPricePaise: number;
  discountAmountPaise: number;
  taxAmountPaise: number;
  lineTotalPaise: number;
}

function drawLineItemsTable(doc: PDFKit.PDFDocument, rows: TableRow[], startY: number): number {
  const pageWidth = doc.page.width;
  const tableWidth = pageWidth - PAGE_MARGIN * 2;

  // Column widths chosen so the money columns are wide enough for ₹9,99,999.00.
  const columns = [
    { label: "Description", width: tableWidth * 0.40, align: "left" as const },
    { label: "Qty", width: tableWidth * 0.09, align: "right" as const },
    { label: "Unit Price", width: tableWidth * 0.15, align: "right" as const },
    { label: "Discount", width: tableWidth * 0.12, align: "right" as const },
    { label: "Tax", width: tableWidth * 0.10, align: "right" as const },
    { label: "Total", width: tableWidth * 0.14, align: "right" as const },
  ];

  let y = startY;

  // Header band
  doc.rect(PAGE_MARGIN, y, tableWidth, 18).fill(IVORY);
  let x = PAGE_MARGIN + 6;
  doc.fillColor(FOREST).font("Helvetica-Bold").fontSize(8);
  for (const column of columns) {
    doc.text(column.label.toUpperCase(), x, y + 5.5, {
      width: column.width - 8,
      align: column.align,
      characterSpacing: 0.5,
    });
    x += column.width;
  }
  y += 18;

  doc.font("Helvetica").fontSize(9);
  for (const row of rows) {
    const descriptionHeight = doc.heightOfString(row.description, { width: columns[0]!.width - 10 });
    const rowHeight = Math.max(20, descriptionHeight + 12);

    // Keep a row with its header rather than splitting it across pages.
    if (y + rowHeight > doc.page.height - 110) {
      doc.addPage();
      y = PAGE_MARGIN;
      doc.rect(PAGE_MARGIN, y, tableWidth, 18).fill(IVORY);
      let headerX = PAGE_MARGIN + 6;
      doc.fillColor(FOREST).font("Helvetica-Bold").fontSize(8);
      for (const column of columns) {
        doc.text(column.label.toUpperCase(), headerX, y + 5.5, {
          width: column.width - 8,
          align: column.align,
          characterSpacing: 0.5,
        });
        headerX += column.width;
      }
      y += 18;
      doc.font("Helvetica").fontSize(9);
    }

    x = PAGE_MARGIN + 6;
    doc.fillColor(FOREST).font("Helvetica-Bold").fontSize(9);
    doc.text(row.description, x, y + 6, { width: columns[0]!.width - 10 });
    doc.fillColor(MUTED).font("Helvetica").fontSize(7.5);
    doc.text(
      (LINE_ITEM_CATEGORY_LABELS[row.category as keyof typeof LINE_ITEM_CATEGORY_LABELS] || row.category).toUpperCase(),
      x,
      y + 6 + doc.heightOfString(row.description, { width: columns[0]!.width - 10 }) + 1,
      { width: columns[0]!.width - 10, characterSpacing: 0.4 }
    );
    x += columns[0]!.width;

    const values = [
      `${row.quantity}${row.unit && row.unit !== "lump-sum" ? "" : ""}`,
      money(row.unitPricePaise),
      row.discountAmountPaise ? `− ${money(row.discountAmountPaise)}` : "—",
      row.taxAmountPaise ? money(row.taxAmountPaise) : "—",
      money(row.lineTotalPaise),
    ];

    doc.fillColor(FOREST).font("Helvetica").fontSize(9);
    values.forEach((value, index) => {
      const column = columns[index + 1]!;
      doc.text(value, x, y + 6, { width: column.width - 8, align: column.align });
      x += column.width;
    });

    y += rowHeight;
    doc.moveTo(PAGE_MARGIN, y).lineTo(pageWidth - PAGE_MARGIN, y).lineWidth(0.4).strokeColor("#E4DFD2").stroke();
  }

  return y + 12;
}

function drawTotals(
  doc: PDFKit.PDFDocument,
  totals: { subtotalPaise: number; discountAmountPaise: number; taxAmountPaise: number; grandTotalPaise: number; advanceRequiredPaise?: number; balancePaise?: number },
  startY: number,
  extraRows: MetaPair[]
): number {
  const pageWidth = doc.page.width;
  const boxWidth = 240;
  const x = pageWidth - PAGE_MARGIN - boxWidth;

  let y = startY;
  const rows: MetaPair[] = [
    { label: "Subtotal", value: money(totals.subtotalPaise) },
    ...(totals.discountAmountPaise ? [{ label: "Discount", value: `− ${money(totals.discountAmountPaise)}` }] : []),
    ...(totals.taxAmountPaise ? [{ label: "Tax", value: money(totals.taxAmountPaise) }] : []),
    ...(totals.advanceRequiredPaise ? [{ label: "Advance Required", value: money(totals.advanceRequiredPaise) }] : []),
    ...extraRows,
  ];

  doc.font("Helvetica").fontSize(9);
  for (const row of rows) {
    doc.fillColor(MUTED).text(row.label, x, y, { width: boxWidth / 2 });
    doc.fillColor(FOREST).text(row.value, x + boxWidth / 2, y, { width: boxWidth / 2, align: "right" });
    y += 14;
  }

  // Grand total band
  y += 2;
  doc.rect(x, y, boxWidth, 24).fill(IVORY);
  doc.fillColor(FOREST).font("Helvetica-Bold").fontSize(9.5);
  doc.text("GRAND TOTAL", x + 8, y + 8, { width: boxWidth / 2 });
  doc.fontSize(12).text(money(totals.grandTotalPaise), x + boxWidth / 2 - 8, y + 6, {
    width: boxWidth / 2,
    align: "right",
  });
  y += 32;

  doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(8);
  doc.text(`Amount in words: ${rupeesInWords(totals.grandTotalPaise)}`, PAGE_MARGIN, y, {
    width: pageWidth - PAGE_MARGIN * 2,
  });

  return doc.y + 12;
}

function drawFooterNotes(
  doc: PDFKit.PDFDocument,
  sections: { heading: string; body: string }[],
  startY: number,
  signatureLabel?: string
): void {
  let y = startY;
  const pageWidth = doc.page.width;

  for (const section of sections) {
    if (!section.body) continue;
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(7.5).text(section.heading.toUpperCase(), PAGE_MARGIN, y, {
      characterSpacing: 1,
    });
    y += 11;
    doc.fillColor(FOREST).font("Helvetica").fontSize(8.5);
    const height = doc.heightOfString(section.body, { width: pageWidth - PAGE_MARGIN * 2 });
    doc.text(section.body, PAGE_MARGIN, y, { width: pageWidth - PAGE_MARGIN * 2, lineGap: 1.5 });
    y += height + 12;
  }

  if (signatureLabel) {
    const boxWidth = 220;
    const x = pageWidth - PAGE_MARGIN - boxWidth;
    const top = Math.max(y + 10, startY + 10);
    doc.moveTo(x, top + 34).lineTo(x + boxWidth, top + 34).lineWidth(0.6).strokeColor(MUTED).stroke();
    doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(signatureLabel, x, top + 38, {
      width: boxWidth,
      align: "center",
    });
  }
}

function renderDocument(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      build(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface QuotationPdfInput {
  quotationNumber: string;
  version: number;
  status: string;
  issueDate: Date;
  validUntil: Date | null;
  customer: { name: string; phone: string; email?: string | null; address?: string | null };
  eventType?: string | null;
  eventDate?: Date | null;
  venue?: string;
  guestCount?: number | null;
  packageName?: string;
  lineItems: TableRow[];
  totals: {
    subtotalPaise: number;
    discountAmountPaise: number;
    taxAmountPaise: number;
    grandTotalPaise: number;
    advanceRequiredPaise: number;
    balancePaise: number;
  };
  paymentTerms?: string;
  notes?: string;
  termsAndConditions?: string;
}

export async function renderQuotationPdf(input: QuotationPdfInput): Promise<Buffer> {
  const brand = await loadBrand();

  return renderDocument((doc) => {
    let y = drawBrandHeader(doc, brand);

    y = drawDocumentMeta(
      doc,
      "QUOTATION",
      [
        { label: "Quotation No.", value: input.quotationNumber },
        { label: "Version", value: `v${input.version}` },
        { label: "Issue Date", value: formatDate(input.issueDate) },
        { label: "Valid Until", value: formatDate(input.validUntil) },
      ],
      y
    );

    const half = (doc.page.width - PAGE_MARGIN * 2) / 2 - 10;

    const customerEnd = drawInfoBox(
      doc,
      "Quoted To",
      [input.customer.name, input.customer.phone, input.customer.email || "", input.customer.address || ""],
      PAGE_MARGIN,
      y,
      half
    );

    const eventEnd = drawInfoBox(
      doc,
      "Event",
      [
        input.eventType ? input.eventType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "",
        input.eventDate ? `Date: ${formatDate(input.eventDate)}` : "",
        input.venue ? `Venue: ${input.venue}` : "",
        input.guestCount ? `Guests: ${input.guestCount}` : "",
        input.packageName ? `Package: ${input.packageName}` : "",
      ],
      PAGE_MARGIN + half + 20,
      y,
      half
    );

    y = Math.max(customerEnd, eventEnd) + 14;
    y = drawLineItemsTable(doc, input.lineItems, y);
    y = drawTotals(doc, input.totals, y, [
      { label: "Balance After Advance", value: money(input.totals.balancePaise) },
    ]);

    drawFooterNotes(
      doc,
      [
        { heading: "Payment terms", body: input.paymentTerms || "" },
        { heading: "Notes", body: input.notes || "" },
        {
          heading: "Validity",
          body: input.validUntil
            ? `This quotation is valid until ${formatDate(input.validUntil)}. Prices are subject to confirmation after that date.`
            : "This quotation is valid for 30 days from the issue date unless stated otherwise.",
        },
        { heading: "Terms & conditions", body: input.termsAndConditions || "" },
      ],
      y,
      "Customer acceptance (signature & date)"
    );
  });
}

export interface InvoicePdfInput {
  invoiceNumber: string;
  status: string;
  issueDate: Date;
  dueDate: Date | null;
  customer: { name: string; phone: string; email?: string | null; address?: string | null };
  eventName?: string;
  eventDate?: Date | null;
  quotationNumber?: string;
  lineItems: TableRow[];
  totals: {
    subtotalPaise: number;
    discountAmountPaise: number;
    taxAmountPaise: number;
    grandTotalPaise: number;
  };
  amountPaidPaise: number;
  outstandingPaise: number;
  notes?: string;
  termsAndConditions?: string;
}

export async function renderInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const brand = await loadBrand();

  return renderDocument((doc) => {
    let y = drawBrandHeader(doc, brand);

    y = drawDocumentMeta(
      doc,
      "INVOICE",
      [
        { label: "Invoice No.", value: input.invoiceNumber },
        { label: "Issue Date", value: formatDate(input.issueDate) },
        { label: "Due Date", value: formatDate(input.dueDate) },
        { label: "Status", value: input.status.replace(/_/g, " ") },
      ],
      y
    );

    const half = (doc.page.width - PAGE_MARGIN * 2) / 2 - 10;

    const customerEnd = drawInfoBox(
      doc,
      "Billed To",
      [input.customer.name, input.customer.phone, input.customer.email || "", input.customer.address || ""],
      PAGE_MARGIN,
      y,
      half
    );

    const eventEnd = drawInfoBox(
      doc,
      "Event",
      [
        input.eventName || "",
        input.eventDate ? `Date: ${formatDate(input.eventDate)}` : "",
        input.quotationNumber ? `Quotation: ${input.quotationNumber}` : "",
      ],
      PAGE_MARGIN + half + 20,
      y,
      half
    );

    y = Math.max(customerEnd, eventEnd) + 14;
    y = drawLineItemsTable(doc, input.lineItems, y);
    y = drawTotals(doc, input.totals, y, [
      { label: "Amount Paid", value: `− ${money(input.amountPaidPaise)}` },
      { label: "Outstanding", value: money(input.outstandingPaise) },
    ]);

    drawFooterNotes(
      doc,
      [
        {
          heading: "Payment terms",
          body: input.dueDate
            ? `Payable by ${formatDate(input.dueDate)}. Please quote the invoice number with every transfer.`
            : "Please quote the invoice number with every transfer.",
        },
        { heading: "Notes", body: input.notes || "" },
        { heading: "Terms & conditions", body: input.termsAndConditions || "" },
      ],
      y
    );
  });
}

export interface ReceiptPdfInput {
  receiptNumber: string;
  paymentDate: Date;
  customer: { name: string; phone: string; email?: string | null };
  eventName?: string;
  invoiceNumber?: string;
  method: string;
  reference?: string;
  amountPaise: number;
  invoiceTotalPaise?: number;
  outstandingPaise?: number;
  notes?: string;
  recordedByName?: string;
}

export async function renderReceiptPdf(input: ReceiptPdfInput): Promise<Buffer> {
  const brand = await loadBrand();

  return renderDocument((doc) => {
    let y = drawBrandHeader(doc, brand);

    y = drawDocumentMeta(
      doc,
      "PAYMENT RECEIPT",
      [
        { label: "Receipt No.", value: input.receiptNumber },
        { label: "Date", value: formatDate(input.paymentDate) },
        { label: "Method", value: input.method.replace(/-/g, " ") },
      ],
      y
    );

    const half = (doc.page.width - PAGE_MARGIN * 2) / 2 - 10;

    const customerEnd = drawInfoBox(
      doc,
      "Received From",
      [input.customer.name, input.customer.phone, input.customer.email || ""],
      PAGE_MARGIN,
      y,
      half
    );

    const appliedEnd = drawInfoBox(
      doc,
      "Applied To",
      [
        input.invoiceNumber ? `Invoice: ${input.invoiceNumber}` : "",
        input.eventName ? `Event: ${input.eventName}` : "",
        input.reference ? `Reference: ${input.reference}` : "",
        input.recordedByName ? `Recorded by: ${input.recordedByName}` : "",
      ],
      PAGE_MARGIN + half + 20,
      y,
      half
    );

    y = Math.max(customerEnd, appliedEnd) + 16;

    const pageWidth = doc.page.width;
    const boxWidth = pageWidth - PAGE_MARGIN * 2;

    doc.rect(PAGE_MARGIN, y, boxWidth, 46).fill(IVORY);
    doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(8).text("AMOUNT RECEIVED", PAGE_MARGIN + 12, y + 10, {
      characterSpacing: 1,
    });
    doc.fillColor(FOREST).font("Times-Bold").fontSize(19).text(money(input.amountPaise), PAGE_MARGIN + 12, y + 20);
    doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(7.5).text(
      rupeesInWords(input.amountPaise),
      PAGE_MARGIN + 12,
      y + 42 - 2
    );
    y += 60;

    if (input.invoiceTotalPaise !== undefined) {
      const rows: MetaPair[] = [
        { label: "Invoice Total", value: money(input.invoiceTotalPaise) },
        { label: "Remaining Balance", value: money(input.outstandingPaise ?? 0) },
      ];
      let rowY = y;
      doc.font("Helvetica").fontSize(9);
      for (const row of rows) {
        doc.fillColor(MUTED).text(row.label, PAGE_MARGIN, rowY, { width: boxWidth / 2 });
        doc.fillColor(FOREST)
          .font("Helvetica-Bold")
          .text(row.value, PAGE_MARGIN, rowY, { width: boxWidth, align: "right" });
        doc.font("Helvetica");
        rowY += 15;
      }
      y = rowY + 12;
    }

    drawFooterNotes(
      doc,
      [
        { heading: "Notes", body: input.notes || "" },
        {
          heading: "Acknowledgement",
          body: "This receipt confirms payment received by Bandhan Events for the invoice referenced above. Please retain it for your records.",
        },
      ],
      y,
      "Received by (signature)"
    );
  });
}

export { rupeesInWords };
