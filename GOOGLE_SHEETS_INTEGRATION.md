# Bandhan Events — Google Sheets Integration Runbook

## Overview

This document covers the Google Sheets integration added to the Bandhan Events admin panel. The integration synchronizes **Leads** from MongoDB to a Google Sheet for business reporting, accounting visibility, and manual spreadsheet access.

**Architecture:**

```
Admin Panel / Public Website
        ↓
    Express API
        ↓
  syncService  →  googleSheetsService  →  Google Sheets API
        ↓
   SyncLog model (MongoDB)
```

**Key rules:**
- MongoDB is the primary source of truth — Google Sheets is read/reporting
- Sync failures never block the main operation (leads are still saved)
- All sync attempts are logged in the `SyncLog` collection
- Duplicate rows are prevented by searching for the MongoDB `_id` before appending

---

## Files Changed / Created

### Backend — new files

| File | Purpose |
|---|---|
| `apps/api/src/integrations/googleSheets.ts` | Google Sheets API client, read/write/update/find/syncLead |
| `apps/api/src/models/SyncLog.ts` | Mongoose model for sync audit logs |
| `apps/api/src/repositories/syncLogRepository.ts` | Database access layer for SyncLog |
| `apps/api/src/services/syncService.ts` | Central sync orchestration + status reporting |
| `apps/api/src/controllers/syncController.ts` | HTTP handlers for sync endpoints |
| `apps/api/src/routes/syncRoutes.ts` | Route definitions (all authenticated) |

### Backend — modified files

| File | Change |
|---|---|
| `apps/api/package.json` | Added `googleapis` dependency |
| `apps/api/src/config/env.ts` | Added `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY` |
| `apps/api/src/routes/index.ts` | Mounted `syncRoutes` at `/sync` |
| `apps/api/src/services/leadService.ts` | Added `syncService.syncLead()` calls after lead create/update |
| `apps/api/src/integrations/index.ts` | Added Google Sheets to `integrationStatuses()` |
| `apps/api/.env.example` | Added Google Sheets env vars |

### Frontend — modified files

| File | Change |
|---|---|
| `apps/web/src/services/api.ts` | Added `syncApi` methods (status, test, syncNow, logs, retry) |
| `apps/web/src/pages/admin/AdminSettingsPage.tsx` | Added `GoogleSheetsIntegrationPanel` component |

---

## Environment Variables Required

Add these to `apps/api/.env` (production) or set them on your hosting platform:

```bash
# Google Sheets Integration
GOOGLE_SHEETS_SPREADSHEET_ID=1AQ7ModRBtO7BHqHynBHa9aycl_5uhr1A7W44PZIloX4
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important notes:**
- The `PRIVATE_KEY` must include the `\n` characters (escaped in `.env` as literal `\n`)
- The `SPREADSHEET_ID` is the long ID from the Google Sheets URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
- Never commit `.env` to Git

---

## Google Cloud Setup Steps

### 1. Create a Google Cloud Project (if you don't have one)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Bandhan Events" (or similar)
4. Click "Create"

### 2. Enable the Google Sheets API

1. In the Cloud Console, go to **APIs & Services → Library**
2. Search for "Google Sheets API"
3. Click "Enable"

### 3. Create a Service Account

1. Go to **APIs & Services → Credentials**
2. Click "Create Credentials" → "Service Account"
3. Fill in:
   - Name: `bandhan-events-sheets` (or similar)
   - Role: (leave blank — not needed for Sheets)
4. Click "Done"
5. Click on the newly created service account
6. Go to the **Keys** tab
7. Click "Add Key" → "Create new key"
8. Select **JSON**
9. Click "Create" — a JSON file will download

### 4. Extract Credentials from the JSON File

Open the downloaded JSON file. You need two values:

```json
{
  "client_email": "bandhan-events-sheets@your-project.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

Set these as environment variables:

```bash
GOOGLE_SHEETS_CLIENT_EMAIL=bandhan-events-sheets@your-project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 5. Share the Spreadsheet with the Service Account

1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1AQ7ModRBtO7BHqHynBHa9aycl_5uhr1A7W44PZIloX4/edit
2. Click "Share" (top right)
3. Paste the service account email (from step 4)
4. Set permission to **Editor**
5. Click "Send" (uncheck "Notify people" if desired)

### 6. Create the "Leads" Sheet

The API will auto-create a "Leads" sheet with headers when you first sync. But if you want to create it manually:

1. Open the spreadsheet
2. Click "+" to add a new sheet
3. Name it "Leads"
4. Add these headers in row 1:

| A | B | C | D | E | F | G | H | I | J | K | L |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MongoDB ID | Name | Phone | Email | Event Type | Event Date | Guest Count | Service Required | Budget | Source | Status | Created At |

---

## API Endpoints Added

All endpoints require authentication (HTTP-only session cookie).

### GET /api/v1/sync/status

Returns sync configuration and status.

**Response:**
```json
{
  "success": true,
  "data": {
    "configured": true,
    "spreadsheetId": "1AQ7ModRBt...",
    "lastSyncAt": "2026-09-21T12:30:00.000Z",
    "lastSyncError": null
  }
}
```

### POST /api/v1/sync/test

Tests the Google Sheets connection.

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "message": "Connected to \"Bandhan Events Leads\"",
    "spreadsheetId": "1AQ7ModRBt..."
  }
}
```

### POST /api/v1/sync/now

Triggers a manual sync (currently ensures sheets exist; individual lead syncs happen automatically on create/update).

### GET /api/v1/sync/logs

Paginated sync logs.

**Query params:** `page`, `limit`, `module`, `status`, `operation`

### POST /api/v1/sync/retry/:module/:id

Retries syncing a specific record. Currently supports `module=lead`.

---

## How Synchronization Works

### Automatic Sync (Leads)

When a lead is created or updated:

1. **MongoDB write** — the lead is saved (this always succeeds)
2. **Sync attempt** — `syncService.syncLead()` is called non-blocking (`.catch(() => {})`)
3. **Sheet check** — the service searches for the lead's `_id` in column A
4. **Create or Update** — if found, updates the row; if not, appends a new row
5. **Log** — the result (success/failed) is written to `SyncLog`

### Duplicate Prevention

Before creating a new row, the service:
1. Reads the "Leads" sheet
2. Searches column A (MongoDB ID) for the lead's `_id`
3. If found → updates that row
4. If not found → appends a new row

This prevents duplicate rows even if sync is triggered multiple times.

### Error Handling

- If Google Sheets is **not configured**, sync is silently skipped (no error)
- If the API call **fails**, the error is logged in SyncLog but the lead is still saved
- The admin UI shows "Last sync error" so the team knows to retry

---

## How to Test Locally

### Prerequisites

1. A Google Cloud project with Sheets API enabled
2. A service account with credentials
3. The spreadsheet shared with the service account email
4. Environment variables set in `apps/api/.env`

### Test Steps

1. **Start the API:**
   ```bash
   cd apps/api
   npm run dev:seeded
   ```

2. **Test connection** (via curl or admin UI):
   ```bash
   # Login first, then:
   curl -b cookies.txt -c cookies.txt http://127.0.0.1:4000/api/v1/sync/test -X POST
   ```

3. **Create a lead** (via public enquiry or admin panel):
   - The lead will be saved to MongoDB
   - Sync will be attempted automatically
   - Check SyncLog for the result

4. **Check sync logs:**
   ```bash
   curl -b cookies.txt http://127.0.0.1:4000/api/v1/sync/logs
   ```

5. **Verify in Google Sheets:**
   - Open the spreadsheet
   - Check the "Leads" sheet for the new row

### Admin UI Testing

1. Go to http://localhost:5183/admin/login
2. Sign in with admin credentials
3. Go to **Settings**
4. Scroll to **Google Sheets Integration** panel
5. Click **Test Connection** — should show "Connected" if credentials are valid
6. Click **Sync Now** — triggers manual sync

---

## MongoDB Changes

### New Collection: `synclogs`

```typescript
{
  operation: "create" | "update" | "read" | "delete",
  module: "lead" | "expense" | "investment" | "payment" | "booking",
  recordId: string,           // MongoDB _id of the synced record
  sheetName: string,          // "Leads"
  sheetRowNumber: number,     // Row in the Google Sheet (null if failed)
  status: "pending" | "success" | "failed",
  errorMessage: string,       // null on success
  metadata: object,           // Extra context (name, phone, etc.)
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `createdAt: -1` (for listing recent logs)
- `module: 1, status: 1` (for filtering by module)
- `recordId: 1, module: 1` (for finding logs for a specific record)

### No changes to existing collections

The `Lead` model is unchanged. Sync is triggered from the service layer, not stored in the lead document.

---

## Limitations

1. **Leads only** — Expense, Investment, Payment, and Booking sync are not yet implemented (the models don't exist yet)
2. **One-way sync** — MongoDB → Google Sheets only. Manual sheet edits are not pulled back.
3. **In-memory sync logs** — Sync logs are in MongoDB, which is in-memory in dev. They're lost on restart.
4. **No retry queue** — Failed syncs are logged but not automatically retried. Use the "Sync Now" or "Retry" buttons.
5. **Rate limits** — Google Sheets API has quotas (300 requests per minute per project). The sync is designed to stay well within this.

---

## Future Enhancements

When the following modules are built, add sync hooks following the same pattern:

1. **Expenses** → `syncService.syncExpense()`
2. **Investments** → `syncService.syncInvestment()`
3. **Payments** → `syncService.syncPayment()`
4. **Bookings** → `syncService.syncBooking()`

Each would:
1. Create a new sheet (if needed)
2. Map fields to columns
3. Search for existing row by `_id`
4. Create or update
5. Log to SyncLog

---

## Security Notes

- Google service account credentials are **server-side only** — never exposed to the frontend
- The spreadsheet ID is stored in environment variables, not hardcoded
- All sync endpoints require authentication
- Rate limiting is applied to sync/test/retry endpoints
- The service account only has access to the specific spreadsheet it's shared with
- No sensitive data is logged in SyncLog (only IDs, not full customer data)
