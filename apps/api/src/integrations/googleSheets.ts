import { google, type sheets_v4 } from "googleapis";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";

/**
 * ---------------------------------------------------------------------------
 * GOOGLE SHEETS INTEGRATION
 * ---------------------------------------------------------------------------
 * Server-side only. Communicates with the Google Sheets API using a service
 * account. The spreadsheet ID and service-account credentials come from
 * environment variables — never hardcoded.
 *
 * Rules:
 *  - Nothing reports success unless the API actually responded.
 *  - When credentials are missing the dashboard shows "not connected".
 *  - All operations are logged for debugging sync issues.
 *  - Duplicate rows are prevented by searching for stable IDs before appending.
 */

interface SheetsCredentials {
  client_email: string;
  private_key: string;
}

let sheetsClient: sheets_v4.Sheets | null = null;

/**
 * Creates an authenticated Google Sheets client from service-account credentials.
 * Returns null if credentials are not configured.
 */
async function getSheetsClient(): Promise<sheets_v4.Sheets | null> {
  if (sheetsClient) return sheetsClient;

  const clientEmail = env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return null;
  }

  try {
    const credentials: SheetsCredentials = {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    sheetsClient = google.sheets({ version: "v4", auth });
    return sheetsClient;
  } catch (error) {
    logger.error("Failed to create Google Sheets client", { error });
    sheetsClient = null;
    return null;
  }
}

/**
 * Returns the spreadsheet ID from environment, or null if not configured.
 */
function getSpreadsheetId(): string | null {
  return env.GOOGLE_SHEETS_SPREADSHEET_ID || null;
}

/**
 * Check if Google Sheets integration is properly configured.
 */
export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    env.GOOGLE_SHEETS_CLIENT_EMAIL &&
    env.GOOGLE_SHEETS_PRIVATE_KEY &&
    env.GOOGLE_SHEETS_SPREADSHEET_ID
  );
}

/**
 * Test the connection to Google Sheets API.
 */
export async function testConnection(): Promise<{ connected: boolean; message: string; spreadsheetId?: string }> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    return { connected: false, message: "Spreadsheet ID not configured." };
  }

  const client = await getSheetsClient();
  if (!client) {
    return { connected: false, message: "Google service account credentials not configured." };
  }

  try {
    const response = await client.spreadsheets.get({
      spreadsheetId,
      fields: "spreadsheetId,properties.title",
    });

    return {
      connected: true,
      message: `Connected to "${response.data.properties?.title || "Untitled"}"`,
      spreadsheetId,
    };
  } catch (error: any) {
    const message = error?.message || "Unknown error";
    if (message.includes("PERMISSION_DENIED")) {
      return { connected: false, message: "Permission denied. Share the spreadsheet with the service account email." };
    }
    if (message.includes("NOT_FOUND")) {
      return { connected: false, message: "Spreadsheet not found. Check the spreadsheet ID." };
    }
    return { connected: false, message: `Connection failed: ${message}` };
  }
}

/**
 * Get all sheet names from the spreadsheet.
 */
export async function getSheetNames(): Promise<string[]> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return [];

  const client = await getSheetsClient();
  if (!client) return [];

  try {
    const response = await client.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title",
    });

    return (response.data.sheets || []).map(
      (sheet) => sheet.properties?.title || ""
    ).filter(Boolean);
  } catch (error) {
    logger.error("Failed to get sheet names", { error });
    return [];
  }
}

/**
 * Read all rows from a specific sheet.
 */
export async function readSheet(sheetName: string): Promise<string[][]> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return [];

  const client = await getSheetsClient();
  if (!client) return [];

  try {
    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    return response.data.values || [];
  } catch (error) {
    logger.error("Failed to read sheet", { sheetName, error });
    return [];
  }
}

/**
 * Find a row by a specific column value (e.g., find a lead by its MongoDB ID).
 * Returns the row index (1-based) or -1 if not found.
 */
export async function findRow(
  sheetName: string,
  columnIndex: number,
  searchValue: string
): Promise<number> {
  const rows = await readSheet(sheetName);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][columnIndex] === searchValue) {
      return i + 1; // 1-based row index for Google Sheets API
    }
  }
  return -1;
}

/**
 * Append a row to the end of a sheet.
 */
export async function appendRow(
  sheetName: string,
  values: string[]
): Promise<{ success: boolean; updatedRange?: string }> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return { success: false };

  const client = await getSheetsClient();
  if (!client) return { success: false };

  try {
    const response = await client.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] },
    });

    return {
      success: true,
      updatedRange: response.data.updates?.updatedRange || undefined,
    };
  } catch (error) {
    logger.error("Failed to append row", { sheetName, error });
    return { success: false };
  }
}

/**
 * Update a specific row in a sheet.
 */
export async function updateRow(
  sheetName: string,
  rowIndex: number,
  values: string[]
): Promise<{ success: boolean }> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return { success: false };

  const client = await getSheetsClient();
  if (!client) return { success: false };

  try {
    await client.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });

    return { success: true };
  } catch (error) {
    logger.error("Failed to update row", { sheetName, rowIndex, error });
    return { success: false };
  }
}

/**
 * Format a Date for display in sheets.
 */
function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

/**
 * Map a Lead document to a sheet row.
 * Column order matches the header: MongoDB ID, Name, Phone, Email, Event Type,
 * Event Date, Guest Count, Service Required, Budget, Source, Status, Created At
 */
export function leadToRow(lead: {
  _id: { toString(): string };
  name: string;
  phone: string;
  email?: string | null;
  eventType: string;
  eventDate?: Date | null;
  guestCount?: number | null;
  serviceRequired: string;
  budget?: string | null;
  source: string;
  status: string;
  createdAt: Date;
}): string[] {
  return [
    lead._id.toString(),
    lead.name,
    lead.phone,
    lead.email || "",
    lead.eventType,
    formatDate(lead.eventDate),
    lead.guestCount?.toString() || "",
    lead.serviceRequired,
    lead.budget || "",
    lead.source,
    lead.status,
    formatDate(lead.createdAt),
  ];
}

/**
 * Sync a lead to Google Sheets.
 * - If the lead already has a row (found by MongoDB ID), update it.
 * - If not found, append a new row.
 */
export async function syncLead(lead: {
  _id: { toString(): string };
  name: string;
  phone: string;
  email?: string | null;
  eventType: string;
  eventDate?: Date | null;
  guestCount?: number | null;
  serviceRequired: string;
  budget?: string | null;
  source: string;
  status: string;
  createdAt: Date;
}): Promise<{ synced: boolean; action: "created" | "updated" | "failed"; error?: string }> {
  const sheetName = "Leads";
  const leadId = lead._id.toString();

  try {
    // Check if row already exists
    const existingRow = await findRow(sheetName, 0, leadId);

    const values = leadToRow(lead);

    if (existingRow > 0) {
      // Update existing row
      const result = await updateRow(sheetName, existingRow, values);
      return { synced: result.success, action: result.success ? "updated" : "failed" };
    } else {
      // Append new row
      const result = await appendRow(sheetName, values);
      return { synced: result.success, action: result.success ? "created" : "failed" };
    }
  } catch (error: any) {
    const message = error?.message || "Unknown sync error";
    logger.error("Lead sync failed", { leadId, error: message });
    return { synced: false, action: "failed", error: message };
  }
}

/**
 * Ensure the Leads sheet exists with proper headers.
 * Creates the sheet if it doesn't exist.
 */
export async function ensureLeadsSheet(): Promise<boolean> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) return false;

  const client = await getSheetsClient();
  if (!client) return false;

  try {
    const sheetNames = await getSheetNames();
    if (sheetNames.includes("Leads")) return true;

    // Create the Leads sheet with headers
    await client.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: "Leads",
              },
            },
          },
        ],
      },
    });

    // Add headers
    const headers = [
      "MongoDB ID",
      "Name",
      "Phone",
      "Email",
      "Event Type",
      "Event Date",
      "Guest Count",
      "Service Required",
      "Budget",
      "Source",
      "Status",
      "Created At",
    ];

    await client.spreadsheets.values.update({
      spreadsheetId,
      range: "Leads!A1:L1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headers] },
    });

    return true;
  } catch (error) {
    logger.error("Failed to ensure Leads sheet", { error });
    return false;
  }
}

/**
 * Map a Payment document to a sheet row.
 */
export function paymentToRow(payment: {
  _id: { toString(): string };
  amount: number;
  paymentDate: Date;
  method: string;
  status: string;
  reference?: string;
  createdAt: Date;
}): string[] {
  return [
    payment._id.toString(),
    payment.amount.toString(),
    formatDate(payment.paymentDate),
    payment.method,
    payment.status,
    payment.reference || "",
    formatDate(payment.createdAt),
  ];
}

/**
 * Sync a payment to Google Sheets.
 */
export async function syncPayment(payment: {
  _id: { toString(): string };
  amount: number;
  paymentDate: Date;
  method: string;
  status: string;
  reference?: string;
  createdAt: Date;
}): Promise<{ synced: boolean; action: "created" | "updated" | "failed"; error?: string }> {
  const sheetName = "Payments";
  const paymentId = payment._id.toString();

  try {
    const existingRow = await findRow(sheetName, 0, paymentId);
    const values = paymentToRow(payment);

    if (existingRow > 0) {
      const result = await updateRow(sheetName, existingRow, values);
      return { synced: result.success, action: result.success ? "updated" : "failed" };
    } else {
      const result = await appendRow(sheetName, values);
      return { synced: result.success, action: result.success ? "created" : "failed" };
    }
  } catch (error: any) {
    const message = error?.message || "Unknown sync error";
    logger.error("Payment sync failed", { paymentId, error: message });
    return { synced: false, action: "failed", error: message };
  }
}

/**
 * Map an Expense document to a sheet row.
 */
export function expenseToRow(expense: {
  _id: { toString(): string };
  date: Date;
  category: string;
  amount: number;
  description?: string;
  vendorName?: string;
  createdAt: Date;
}): string[] {
  return [
    expense._id.toString(),
    formatDate(expense.date),
    expense.category,
    expense.amount.toString(),
    expense.description || "",
    expense.vendorName || "",
    formatDate(expense.createdAt),
  ];
}

/**
 * Sync an expense to Google Sheets.
 */
export async function syncExpense(expense: {
  _id: { toString(): string };
  date: Date;
  category: string;
  amount: number;
  description?: string;
  createdAt: Date;
}): Promise<{ synced: boolean; action: "created" | "updated" | "failed"; error?: string }> {
  const sheetName = "Expenses";
  const expenseId = expense._id.toString();

  try {
    const existingRow = await findRow(sheetName, 0, expenseId);
    const values = expenseToRow(expense);

    if (existingRow > 0) {
      const result = await updateRow(sheetName, existingRow, values);
      return { synced: result.success, action: result.success ? "updated" : "failed" };
    } else {
      const result = await appendRow(sheetName, values);
      return { synced: result.success, action: result.success ? "created" : "failed" };
    }
  } catch (error: any) {
    const message = error?.message || "Unknown sync error";
    logger.error("Expense sync failed", { expenseId, error: message });
    return { synced: false, action: "failed", error: message };
  }
}

/**
 * Map an Investment document to a sheet row.
 */
export function investmentToRow(investment: {
  _id: { toString(): string };
  date: Date;
  partner: string;
  amount: number;
  type: string;
  purpose?: string;
  createdAt: Date;
}): string[] {
  return [
    investment._id.toString(),
    formatDate(investment.date),
    investment.partner,
    investment.amount.toString(),
    investment.type,
    investment.purpose || "",
    formatDate(investment.createdAt),
  ];
}

/**
 * Sync an investment to Google Sheets.
 */
export async function syncInvestment(investment: {
  _id: { toString(): string };
  date: Date;
  partner: string;
  amount: number;
  type: string;
  createdAt: Date;
}): Promise<{ synced: boolean; action: "created" | "updated" | "failed"; error?: string }> {
  const sheetName = "Investments";
  const investmentId = investment._id.toString();

  try {
    const existingRow = await findRow(sheetName, 0, investmentId);
    const values = investmentToRow(investment);

    if (existingRow > 0) {
      const result = await updateRow(sheetName, existingRow, values);
      return { synced: result.success, action: result.success ? "updated" : "failed" };
    } else {
      const result = await appendRow(sheetName, values);
      return { synced: result.success, action: result.success ? "created" : "failed" };
    }
  } catch (error: any) {
    const message = error?.message || "Unknown sync error";
    logger.error("Investment sync failed", { investmentId, error: message });
    return { synced: false, action: "failed", error: message };
  }
}

/**
 * Map an Event document to a sheet row.
 */
export function eventToRow(event: {
  _id: { toString(): string };
  eventName: string;
  eventType: string;
  eventDate: Date;
  venue?: string;
  status: string;
  contractAmount: number;
  createdAt: Date;
}): string[] {
  return [
    event._id.toString(),
    event.eventName,
    event.eventType,
    formatDate(event.eventDate),
    event.venue || "",
    event.status,
    event.contractAmount.toString(),
    formatDate(event.createdAt),
  ];
}

/**
 * Sync an event to Google Sheets.
 */
export async function syncEvent(event: {
  _id: { toString(): string };
  eventName: string;
  eventType: string;
  eventDate: Date;
  venue?: string;
  status: string;
  contractAmount: number;
  createdAt: Date;
}): Promise<{ synced: boolean; action: "created" | "updated" | "failed"; error?: string }> {
  const sheetName = "Events";
  const eventId = event._id.toString();

  try {
    const existingRow = await findRow(sheetName, 0, eventId);
    const values = eventToRow(event);

    if (existingRow > 0) {
      const result = await updateRow(sheetName, existingRow, values);
      return { synced: result.success, action: result.success ? "updated" : "failed" };
    } else {
      const result = await appendRow(sheetName, values);
      return { synced: result.success, action: result.success ? "created" : "failed" };
    }
  } catch (error: any) {
    const message = error?.message || "Unknown sync error";
    logger.error("Event sync failed", { eventId, error: message });
    return { synced: false, action: "failed", error: message };
  }
}

// ── Vendors ──────────────────────────────────────────────────────────────────

/**
 * Map a Vendor document to a sheet row.
 * Row 0 is always the MongoDB id: every sync looks the row up by that value, so
 * a vendor edited a hundred times still occupies exactly one row.
 */
export function vendorToRow(vendor: {
  _id: { toString(): string };
  name: string;
  type: string;
  category?: string;
  contactPerson?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  area?: string;
  city?: string;
  status: string;
  createdAt: Date;
  updatedAt?: Date;
}): string[] {
  return [
    vendor._id.toString(),
    vendor.name,
    vendor.type,
    vendor.category || "",
    vendor.contactPerson || "",
    vendor.phone || "",
    vendor.whatsapp || "",
    vendor.email || "",
    vendor.area || "",
    vendor.city || "",
    vendor.status,
    formatDate(vendor.createdAt),
    vendor.updatedAt ? formatDate(vendor.updatedAt) : "",
  ];
}

/** Upsert a vendor row, matched on the MongoDB id. */
export async function syncVendor(vendor: Parameters<typeof vendorToRow>[0]): Promise<{
  synced: boolean;
  action: "created" | "updated" | "failed";
  error?: string;
}> {
  const sheetName = "Vendors";
  const vendorId = vendor._id.toString();

  try {
    const existingRow = await findRow(sheetName, 0, vendorId);
    const values = vendorToRow(vendor);

    if (existingRow > 0) {
      const result = await updateRow(sheetName, existingRow, values);
      return { synced: result.success, action: result.success ? "updated" : "failed" };
    }

    const result = await appendRow(sheetName, values);
    return { synced: result.success, action: result.success ? "created" : "failed" };
  } catch (error: any) {
    const message = error?.message || "Unknown sync error";
    logger.error("Vendor sync failed", { vendorId, error: message });
    return { synced: false, action: "failed", error: message };
  }
}

// ── Vendor assignments ───────────────────────────────────────────────────────

/**
 * Map one vendor-on-an-event assignment to a sheet row.
 *
 * The row is keyed by the assignment id (the event subdocument `_id`), not by
 * the event id, so a vendor booked twice on the same event — a caterer who also
 * does the lighting — produces two rows rather than one overwriting the other.
 */
export function vendorAssignmentToRow(assignment: {
  assignmentId: string;
  eventId: { toString(): string };
  vendorId: { toString(): string };
  vendorName: string;
  role?: string;
  service?: string;
  eventDate: Date;
  agreedCost: number;
  amountPaid: number;
  status: string;
}): string[] {
  return [
    assignment.assignmentId,
    assignment.eventId.toString(),
    assignment.vendorId.toString(),
    assignment.vendorName,
    assignment.role || "",
    assignment.service || "",
    formatDate(assignment.eventDate),
    assignment.agreedCost.toString(),
    assignment.amountPaid.toString(),
    Math.max(0, assignment.agreedCost - assignment.amountPaid).toString(),
    assignment.status,
  ];
}

export async function syncVendorAssignment(
  assignment: Parameters<typeof vendorAssignmentToRow>[0]
): Promise<{ synced: boolean; action: "created" | "updated" | "failed"; error?: string }> {
  const sheetName = "Vendor Assignments";
  const assignmentId = assignment.assignmentId;

  try {
    const existingRow = await findRow(sheetName, 0, assignmentId);
    const values = vendorAssignmentToRow(assignment);

    if (existingRow > 0) {
      const result = await updateRow(sheetName, existingRow, values);
      return { synced: result.success, action: result.success ? "updated" : "failed" };
    }

    const result = await appendRow(sheetName, values);
    return { synced: result.success, action: result.success ? "created" : "failed" };
  } catch (error: any) {
    const message = error?.message || "Unknown sync error";
    logger.error("Vendor assignment sync failed", { assignmentId, error: message });
    return { synced: false, action: "failed", error: message };
  }
}

// ── Quotations ───────────────────────────────────────────────────────────────

/**
 * Map a Quotation document to a sheet row. Money is written in rupees — the
 * sheet is read by people, and the paise detail lives in MongoDB.
 */
export function quotationToRow(quotation: {
  _id: { toString(): string };
  quotationNumber: string;
  version?: number;
  status: string;
  issueDate: Date;
  validUntil?: Date | null;
  customerName?: string;
  eventName?: string;
  totals?: { subtotalPaise?: number; discountAmountPaise?: number; taxAmountPaise?: number; grandTotalPaise?: number; advanceRequiredPaise?: number };
  createdAt: Date;
}): string[] {
  const paiseToRupees = (value: number | undefined) => ((value ?? 0) / 100).toFixed(2);

  return [
    quotation._id.toString(),
    quotation.quotationNumber,
    String(quotation.version ?? 1),
    quotation.customerName || "",
    quotation.eventName || "",
    formatDate(quotation.issueDate),
    formatDate(quotation.validUntil ?? null),
    quotation.status,
    paiseToRupees(quotation.totals?.subtotalPaise),
    paiseToRupees(quotation.totals?.discountAmountPaise),
    paiseToRupees(quotation.totals?.taxAmountPaise),
    paiseToRupees(quotation.totals?.grandTotalPaise),
    paiseToRupees(quotation.totals?.advanceRequiredPaise),
    formatDate(quotation.createdAt),
  ];
}

/** Upserts a quotation row, keyed on the MongoDB id in column A. */
export async function syncQuotation(quotation: Parameters<typeof quotationToRow>[0]) {
  const sheetName = "Quotations";
  const id = quotation._id.toString();

  try {
    const existingRow = await findRow(sheetName, 0, id);
    const values = quotationToRow(quotation);

    if (existingRow > 0) {
      const result = await updateRow(sheetName, existingRow, values);
      return { synced: result.success, action: result.success ? ("updated" as const) : ("failed" as const) };
    }

    const result = await appendRow(sheetName, values);
    return { synced: result.success, action: result.success ? ("created" as const) : ("failed" as const) };
  } catch (error: any) {
    const message = error?.message || "Unknown sync error";
    logger.error("Quotation sync failed", { quotationId: id, error: message });
    return { synced: false, action: "failed" as const, error: message };
  }
}

// ── Invoices ─────────────────────────────────────────────────────────────────

/**
 * Map an Invoice document to a sheet row. `amountPaid` and `outstanding` are
 * passed in already derived from the Payment collection. All figures are
 * rupees; the stored totals are paise and converted here.
 */
export function invoiceToRow(invoice: {
  _id: { toString(): string };
  invoiceNumber: string;
  status: string;
  issueDate: Date;
  dueDate?: Date | null;
  customerName?: string;
  eventName?: string;
  quotationNumber?: string;
  totals?: { grandTotalPaise?: number };
  amountPaidPaise?: number;
  outstandingPaise?: number;
  createdAt: Date;
}): string[] {
  const paiseToRupees = (value: number | undefined) => ((value ?? 0) / 100).toFixed(2);

  return [
    invoice._id.toString(),
    invoice.invoiceNumber,
    invoice.customerName || "",
    invoice.eventName || "",
    invoice.quotationNumber || "",
    formatDate(invoice.issueDate),
    formatDate(invoice.dueDate ?? null),
    paiseToRupees(invoice.totals?.grandTotalPaise),
    paiseToRupees(invoice.amountPaidPaise),
    paiseToRupees(invoice.outstandingPaise),
    invoice.status,
    formatDate(invoice.createdAt),
  ];
}

/** Upserts an invoice row, keyed on the MongoDB id in column A. */
export async function syncInvoice(invoice: Parameters<typeof invoiceToRow>[0]) {
  const sheetName = "Invoices";
  const id = invoice._id.toString();

  try {
    const existingRow = await findRow(sheetName, 0, id);
    const values = invoiceToRow(invoice);

    if (existingRow > 0) {
      const result = await updateRow(sheetName, existingRow, values);
      return { synced: result.success, action: result.success ? ("updated" as const) : ("failed" as const) };
    }

    const result = await appendRow(sheetName, values);
    return { synced: result.success, action: result.success ? ("created" as const) : ("failed" as const) };
  } catch (error: any) {
    const message = error?.message || "Unknown sync error";
    logger.error("Invoice sync failed", { invoiceId: id, error: message });
    return { synced: false, action: "failed" as const, error: message };
  }
}

/**
 * Get sync status for the dashboard.
 */
export function getSyncStatus(): {
  configured: boolean;
  spreadsheetId: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
} {
  return {
    configured: isGoogleSheetsConfigured(),
    spreadsheetId: getSpreadsheetId(),
    lastSyncAt: null, // Will be populated from SyncLog model
    lastSyncError: null,
  };
}

export const googleSheetsService = {
  isConfigured: isGoogleSheetsConfigured,
  testConnection,
  getSheetNames,
  readSheet,
  findRow,
  appendRow,
  updateRow,
  syncLead,
  syncPayment,
  syncExpense,
  syncInvestment,
  syncEvent,
  syncQuotation,
  syncInvoice,
  syncVendor,
  syncVendorAssignment,
  ensureLeadsSheet,
  getSyncStatus,
  leadToRow,
  paymentToRow,
  expenseToRow,
  investmentToRow,
  eventToRow,
  quotationToRow,
  invoiceToRow,
  vendorToRow,
  vendorAssignmentToRow,
};
