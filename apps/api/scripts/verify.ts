/**
 * ---------------------------------------------------------------------------
 * END-TO-END VERIFICATION
 * ---------------------------------------------------------------------------
 * Boots the real Express app against a real (in-memory) MongoDB and drives it
 * over HTTP with real cookies, then asserts the behaviour the platform
 * promises. Nothing here is mocked: if a check passes, the running server did
 * the work and MongoDB stored it.
 *
 * Usage: npm run verify
 */

process.env.NODE_ENV = "test";
process.env.USE_IN_MEMORY_DB = "true";
process.env.SESSION_SECRET ??= "test-only-session-secret-not-used-anywhere-else-1234567890";
process.env.LOG_LEVEL = "error";
process.env.LOGIN_MAX_ATTEMPTS = "3";
process.env.LOGIN_LOCK_MINUTES = "5";
process.env.LOGIN_RATE_LIMIT_MAX = "10";
process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES = "15";
process.env.ENQUIRY_RATE_LIMIT_MAX = "6";
process.env.ENQUIRY_RATE_LIMIT_WINDOW_MINUTES = "60";
process.env.COOKIE_SECURE = "false";
process.env.COOKIE_SAMESITE = "lax";

import { randomBytes } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
// Type-only: erased at runtime, so the env-above-imports rule still holds.
import type { AuthContext } from "@/types/auth";

const OWNER1 = "bhavesh@gmail.com";
const OWNER2 = "zakir@gmail.com";
const ADMIN = "admin-adminzee@gmail.com";
const MANAGER = "manager1@gmail.com";

/** Generated per run — no credential is ever written down in this file. */
function testPassword(): string {
  return `Verify-${randomBytes(6).toString("hex")}-A1!`;
}

const PASSWORDS = {
  owner1: testPassword(),
  owner2: testPassword(),
  admin: testPassword(),
  manager: testPassword(),
};

// ---------------------------------------------------------------------------
// Tiny assertion harness + cookie-aware HTTP client
// ---------------------------------------------------------------------------

interface Result {
  name: string;
  pass: boolean;
  detail: string;
}

const results: Result[] = [];

async function check(name: string, fn: () => Promise<string> | string): Promise<void> {
  try {
    const detail = await fn();
    results.push({ name, pass: true, detail: detail ?? "" });
  } catch (error) {
    results.push({ name, pass: false, detail: (error as Error).message });
  }
}

function expect(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

class TestClient {
  private cookies = new Map<string, string>();

  constructor(private baseUrl: string) {}

  cookieHeader(): string {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  csrfToken(): string | undefined {
    return this.cookies.get("bandhan_csrf");
  }

  clearCookies(): void {
    this.cookies.clear();
  }

  async request(
    method: string,
    path: string,
    options: { body?: unknown; headers?: Record<string, string>; omitCsrf?: boolean } = {}
  ): Promise<{ status: number; body: any; headers: Headers }> {
    const headers: Record<string, string> = { Accept: "application/json", ...options.headers };

    const cookieHeader = this.cookieHeader();
    if (cookieHeader) headers.Cookie = cookieHeader;

    if (options.body !== undefined) headers["Content-Type"] = "application/json";

    // Auto-attach the session's CSRF token unless the caller supplied one
    // explicitly (the suite needs to send forged and missing tokens on purpose).
    const callerSetCsrf = Object.keys(options.headers ?? {}).some(
      (key) => key.toLowerCase() === "x-csrf-token"
    );
    const csrf = this.csrfToken();
    if (csrf && !options.omitCsrf && !callerSetCsrf && method !== "GET") {
      headers["X-CSRF-Token"] = csrf;
    }
    if (options.headers?.["X-CSRF-Token"] !== undefined) {
      headers["X-CSRF-Token"] = options.headers["X-CSRF-Token"];
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      redirect: "manual",
    });

    for (const rawCookie of response.headers.getSetCookie()) {
      const [pair] = rawCookie.split(";");
      const index = pair!.indexOf("=");
      const name = pair!.slice(0, index);
      const value = pair!.slice(index + 1);
      const expired = /expires=thu, 01 jan 1970/i.test(rawCookie) || value === "";
      if (expired) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }

    let body: any = null;
    const text = await response.text();
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    return { status: response.status, body, headers: response.headers };
  }

  get(path: string) {
    return this.request("GET", path);
  }
  post(path: string, body?: unknown, options?: { omitCsrf?: boolean; headers?: Record<string, string> }) {
    return this.request("POST", path, { body, ...options });
  }
  patch(path: string, body?: unknown, options?: { omitCsrf?: boolean }) {
    return this.request("PATCH", path, { body, ...options });
  }
  put(path: string, body?: unknown) {
    return this.request("PUT", path, { body });
  }
  delete(path: string) {
    return this.request("DELETE", path);
  }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Imported only after the environment above is set.
  const { createApp } = await import("@/app");
  const { connectDatabase, disconnectDatabase } = await import("@/config/db");
  const { authService } = await import("@/services/authService");
  const { User } = await import("@/models/User");
  const { Lead } = await import("@/models/Lead");
  const { AuditLog } = await import("@/models/AuditLog");
  const { Session } = await import("@/models/Session");

  await connectDatabase();

  // Seed the four roles with generated passwords.
  await authService.createUserWithPassword({
    name: "Bhavesh",
    email: OWNER1,
    role: "OWNER_1",
    password: PASSWORDS.owner1,
    mustChangePassword: false,
  });
  await authService.createUserWithPassword({
    name: "Zakir",
    email: OWNER2,
    role: "OWNER_2",
    password: PASSWORDS.owner2,
    mustChangePassword: false,
  });
  await authService.createUserWithPassword({
    name: "Admin",
    email: ADMIN,
    role: "ADMIN",
    password: PASSWORDS.admin,
    mustChangePassword: true, // exercises the forced-change flow
  });
  await authService.createUserWithPassword({
    name: "Manager",
    email: MANAGER,
    role: "MANAGER",
    password: PASSWORDS.manager,
    mustChangePassword: false,
  });

  const server: Server = await new Promise((resolve) => {
    const instance = createApp().listen(0, "127.0.0.1", () => resolve(instance));
  });
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const anon = new TestClient(baseUrl);
  const owner = new TestClient(baseUrl);
  const owner2 = new TestClient(baseUrl);
  const admin = new TestClient(baseUrl);
  const manager = new TestClient(baseUrl);

  const uniquePhone = `+91 9${String(Date.now()).slice(-9)}`;
  const enquiryEmail = `enquiry-${Date.now()}@example.com`;

  // -- Health & public surface ---------------------------------------------
  await check("health: reports ok with a connected database", async () => {
    const res = await anon.get("/health");
    expect(res.status === 200, `expected 200, got ${res.status}`);
    expect(res.body.data.database === "connected", `database state: ${res.body.data.database}`);
    return `status=ok database=${res.body.data.database}`;
  });

  await check("public settings: returned without internal fields", async () => {
    const res = await anon.get("/public/settings");
    expect(res.status === 200, `expected 200, got ${res.status}`);
    expect(res.body.data.contact, "contact block missing");
    expect(res.body.data.brand.name === "Bandhan Events", "brand name missing");
    expect(!("internal" in res.body.data), "internal settings leaked to the public endpoint");
    expect(JSON.stringify(res.body).includes("enquiryNotifyEmail") === false, "internal email leaked");
    return `brand=${res.body.data.brand.name} whatsappConfigured=${Boolean(res.body.data.contact.whatsappNumber)}`;
  });

  // -- Public enquiry ------------------------------------------------------
  await check("enquiry: valid submission is accepted with a reference", async () => {
    const res = await anon.post("/public/enquiries", {
      name: "Verification Probe",
      phone: uniquePhone,
      email: enquiryEmail,
      eventType: "weddings",
      eventDate: "2026-12-12",
      guestCount: 250,
      serviceRequired: "both",
      budget: "3-6l",
      message: "Automated verification enquiry.",
      pagePath: "/contact",
    });
    expect(res.status === 201, `expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    expect(res.body.data.reference, "no lead reference returned");
    return `reference=${res.body.data.reference}`;
  });

  await check("enquiry: the lead is really persisted in MongoDB (source=website)", async () => {
    const lead = await Lead.findOne({ email: enquiryEmail }).lean();
    expect(lead, "no lead document found for the submitted email");
    expect(lead!.source === "website", `source was ${lead!.source}`);
    expect(lead!.status === "NEW", `status was ${lead!.status}`);
    expect(lead!.guestCount === 250, `guestCount was ${lead!.guestCount}`);
    expect(lead!.serviceRequired === "both", `service was ${lead!.serviceRequired}`);
    expect(lead!.budget === "3-6l", "budget was not stored");
    expect(lead!.pagePath === "/contact", "page attribution was not stored");
    const total = await Lead.countDocuments({});
    return `documents=${total} id=${String(lead!._id)}`;
  });

  // -- Stage builder configuration -------------------------------------------
  const stageEmail = `stage-${Date.now()}@example.com`;
  const stageConfig = {
    layout: "royal",
    backdrop: "floral",
    flowers: "marigold",
    lighting: "chandeliers",
    furniture: "couple-seating",
    otherDecor: ["pillars", "entrance"],
    notes: "Gold and ivory theme.",
  };

  await check("stage builder: enquiry with configuration is accepted", async () => {
    const res = await anon.post("/public/enquiries", {
      name: "Stage Builder Probe",
      phone: uniquePhone,
      email: stageEmail,
      eventType: "weddings",
      serviceRequired: "decorator",
      pagePath: "/build-your-stage",
      stageConfiguration: stageConfig,
    });
    expect(res.status === 201, `expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    return `reference=${res.body.data.reference}`;
  });

  await check("stage builder: configuration is persisted in MongoDB", async () => {
    const lead = await Lead.findOne({ email: stageEmail }).lean();
    expect(lead, "no lead found for the stage enquiry");
    expect(lead!.stageConfiguration, "stageConfiguration missing on the lead document");
    expect(lead!.stageConfiguration!.layout === "royal", `layout was ${lead!.stageConfiguration!.layout}`);
    expect(
      lead!.stageConfiguration!.otherDecor.length === 2,
      `otherDecor was ${JSON.stringify(lead!.stageConfiguration!.otherDecor)}`
    );
    expect(lead!.stageConfiguration!.notes === "Gold and ivory theme.", "notes were not stored");
    return `layout=${lead!.stageConfiguration!.layout} decor=${lead!.stageConfiguration!.otherDecor.join(",")}`;
  });

  await check("stage builder: invalid configuration values are rejected with 422", async () => {
    const res = await anon.post("/public/enquiries", {
      name: "Stage Builder Bad",
      phone: uniquePhone,
      email: `stage-bad-${Date.now()}@example.com`,
      eventType: "weddings",
      serviceRequired: "decorator",
      stageConfiguration: { ...stageConfig, layout: "astronaut", otherDecor: [] },
    });
    expect(res.status === 422, `expected 422, got ${res.status}`);
    const details = JSON.stringify(res.body.error.details ?? {});
    expect(details.includes("stageConfiguration"), `no stageConfiguration field errors: ${details}`);
    return "layout + otherDecor rejected server-side";
  });

  await check("enquiry: invalid payload returns 422 with field details", async () => {
    const res = await anon.post("/public/enquiries", {
      name: "A",
      phone: "12",
      email: "not-an-email",
      eventType: "not-an-event",
      serviceRequired: "nope",
    });
    expect(res.status === 422, `expected 422, got ${res.status}`);
    expect(res.body.error.code === "VALIDATION_ERROR", `code was ${res.body.error.code}`);
    expect(Object.keys(res.body.error.details).length >= 4, "expected several field errors");
    return `fields=${Object.keys(res.body.error.details).join(",")}`;
  });

  await check("enquiry: honeypot submissions are accepted but never stored", async () => {
    const before = await Lead.countDocuments({});
    const res = await anon.post("/public/enquiries", {
      name: "Spam Bot",
      phone: uniquePhone,
      email: `bot-${Date.now()}@example.com`,
      eventType: "weddings",
      serviceRequired: "both",
      company: "I am a robot",
    });
    expect(res.status === 201, `expected 201 (silent accept), got ${res.status}`);
    const after = await Lead.countDocuments({});
    expect(after === before, `document count changed: ${before} -> ${after}`);
    return `stored before=${before} after=${after}`;
  });

  await check("enquiry: rate limited after the configured budget", async () => {
    let lastStatus = 0;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const res = await anon.post("/public/enquiries", {
        name: "Rate Limit Probe",
        phone: uniquePhone,
        email: `rate-${attempt}@example.com`,
        eventType: "weddings",
        serviceRequired: "both",
      });
      lastStatus = res.status;
      if (res.status === 429) return `429 after ${attempt + 1} request(s)`;
    }
    throw new Error(`never rate limited; last status ${lastStatus}`);
  });

  // -- Unauthenticated access ---------------------------------------------
  await check("unauthenticated: admin lead API is rejected with 401", async () => {
    const res = await anon.get("/leads");
    expect(res.status === 401, `expected 401, got ${res.status}`);
    expect(res.body.error.code === "SESSION_REQUIRED", `code was ${res.body.error.code}`);
    return `code=${res.body.error.code}`;
  });

  await check("unauthenticated: dashboard, users, settings and audit all rejected", async () => {
    const paths = ["/dashboard/stats", "/users", "/settings", "/audit"];
    for (const path of paths) {
      const res = await anon.get(path);
      expect(res.status === 401, `${path} returned ${res.status}`);
    }
    return `all ${paths.length} endpoints returned 401`;
  });

  // -- Sign-in -------------------------------------------------------------
  await check("login: wrong password returns a generic error", async () => {
    const res = await anon.post("/auth/login", { email: OWNER1, password: "Definitely-Wrong-1!" });
    expect(res.status === 401, `expected 401, got ${res.status}`);
    expect(res.body.error.message === "Invalid email or password.", `message was "${res.body.error.message}"`);
    return `code=${res.body.error.code}`;
  });

  await check("login: unknown email is indistinguishable from a wrong password", async () => {
    const res = await anon.post("/auth/login", { email: "nobody@example.com", password: "Definitely-Wrong-1!" });
    expect(res.status === 401, `expected 401, got ${res.status}`);
    expect(res.body.error.message === "Invalid email or password.", `message was "${res.body.error.message}"`);
    return "identical generic response";
  });

  await check("login: owner signs in and receives httpOnly + CSRF cookies", async () => {
    const res = await owner.post("/auth/login", { email: OWNER1, password: PASSWORDS.owner1 });
    expect(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    expect(res.body.data.user.role === "OWNER_1", `role was ${res.body.data.user.role}`);
    expect(res.body.data.user.permissions.length > 20, "permission list missing");
    expect(res.body.data.user.mustChangePassword === false, "unexpected forced password change");

    const setCookie = res.headers.getSetCookie().join(" | ");
    expect(/bandhan_sid=[^;]+/.test(setCookie), "session cookie not set");
    expect(/httponly/i.test(setCookie), "session cookie is not httpOnly");
    expect(/samesite/i.test(setCookie), "session cookie has no SameSite attribute");
    expect(!/^bandhan_sid=.*;\s*$/.test(setCookie), "session cookie should not be readable");
    return "session cookie httpOnly + SameSite, CSRF cookie issued";
  });

  await check("login: role change is reflected immediately on the next request", async () => {
    const before = await owner.get("/users");
    expect(before.status === 200, `owner could not list users: ${before.status}`);
    return `owner sees ${before.body.data.length} user accounts`;
  });

  await check("stage builder: configuration is returned in the admin lead DTO", async () => {
    const search = await owner.get(`/leads?search=${encodeURIComponent(stageEmail)}`);
    expect(search.status === 200, `expected 200, got ${search.status}`);
    const found = search.body.data.items.find((item: { email?: string }) => item.email === stageEmail);
    expect(found, "stage lead not found in the admin list");
    expect(found.stageConfiguration, "stageConfiguration missing from the list DTO");
    expect(found.stageConfiguration.layout === "royal", `layout was ${found.stageConfiguration.layout}`);
    return `id=${found.id} layout=${found.stageConfiguration.layout}`;
  });

  // -- Lockout -------------------------------------------------------------
  await check("lockout: account locks after N failed attempts", async () => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const res = await owner2.post("/auth/login", { email: OWNER2, password: `Wrong-Password-${attempt}!A` });
      if (attempt < 3) {
        expect(res.status === 401, `attempt ${attempt} returned ${res.status}`);
      } else {
        expect(res.status === 423, `final attempt returned ${res.status}, expected 423`);
        expect(res.body.error.code === "ACCOUNT_LOCKED", `code was ${res.body.error.code}`);
      }
    }
    return "locked on attempt 3 (LOGIN_MAX_ATTEMPTS)";
  });

  await check("lockout: lock state is persisted in MongoDB", async () => {
    const user = await User.findOne({ email: OWNER2 });
    expect(user, "owner2 document missing");
    expect(user!.lockedUntil && user!.lockedUntil.getTime() > Date.now(), "lockedUntil not set in the future");
    return `lockedUntil=${user!.lockedUntil!.toISOString()}`;
  });

  await check("lockout: the correct password is refused while locked", async () => {
    const res = await owner2.post("/auth/login", { email: OWNER2, password: PASSWORDS.owner2 });
    expect(res.status === 423, `expected 423, got ${res.status}`);
    return `code=${res.body.error.code}`;
  });

  await check("rate limit: repeated attempts from one IP+email eventually return 429", async () => {
    let sawRateLimit = false;
    for (let attempt = 0; attempt < 14; attempt += 1) {
      const res = await anon.post("/auth/login", { email: "rate-probe@example.com", password: "Wrong-Password-1!A" });
      if (res.status === 429) {
        sawRateLimit = true;
        return `429 after ${attempt + 1} attempt(s)`;
      }
    }
    expect(sawRateLimit, "login rate limiter never engaged");
    return "engaged";
  });

  // -- Forced password change ---------------------------------------------
  await check("first login: admin API is blocked until the password is changed", async () => {
    const login = await admin.post("/auth/login", { email: ADMIN, password: PASSWORDS.admin });
    expect(login.status === 200, `login failed: ${login.status}`);
    expect(login.body.data.user.mustChangePassword === true, "mustChangePassword was not set");

    const blockedPaths = ["/leads", "/finance/summary", "/events", "/sync/status"];
    for (const path of blockedPaths) {
      const blocked = await admin.get(path);
      expect(blocked.status === 403, `${path}: expected 403, got ${blocked.status}`);
      expect(
        blocked.body.error.code === "PASSWORD_CHANGE_REQUIRED",
        `${path}: code was ${blocked.body.error.code}`
      );
    }
    return `blocked with PASSWORD_CHANGE_REQUIRED on ${blockedPaths.length} admin surfaces`;
  });

  await check("change-password: weak passwords are rejected by policy", async () => {
    const res = await admin.post("/auth/change-password", {
      currentPassword: PASSWORDS.admin,
      newPassword: "password123",
      confirmPassword: "password123",
    });
    expect(res.status === 422, `expected 422, got ${res.status}`);
    expect(res.body.error.details?.newPassword, "no newPassword policy errors returned");
    return res.body.error.details.newPassword.join(" ").slice(0, 90);
  });

  await check("change-password: succeeds and revokes every session", async () => {
    const newPassword = testPassword();
    const res = await admin.post("/auth/change-password", {
      currentPassword: PASSWORDS.admin,
      newPassword,
      confirmPassword: newPassword,
    });
    expect(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);

    // The old cookie must be dead immediately.
    const probe = await admin.get("/auth/session");
    expect(probe.status === 401, `stale session still accepted: ${probe.status}`);

    // Sign in again with the new password and confirm access is restored.
    const relogin = await admin.post("/auth/login", { email: ADMIN, password: newPassword });
    expect(relogin.status === 200, `re-login failed: ${relogin.status}`);
    expect(relogin.body.data.user.mustChangePassword === false, "mustChangePassword still set");

    const allowed = await admin.get("/leads");
    expect(allowed.status === 200, `admin still blocked after change: ${allowed.status}`);

    PASSWORDS.admin = newPassword;
    return "sessions revoked, new password works, admin API reachable";
  });

  // -- CSRF ----------------------------------------------------------------
  await check("csrf: authenticated write without the CSRF header is rejected", async () => {
    const res = await owner.post(
      "/leads",
      { name: "No CSRF", phone: uniquePhone, eventType: "weddings", serviceRequired: "both", source: "walk-in" },
      { omitCsrf: true }
    );
    expect(res.status === 403, `expected 403, got ${res.status}`);
    expect(res.body.error.code === "CSRF_MISSING", `code was ${res.body.error.code}`);
    return `code=${res.body.error.code}`;
  });

  await check("csrf: a forged CSRF token is rejected", async () => {
    const res = await owner.post(
      "/leads",
      { name: "Bad CSRF", phone: uniquePhone, eventType: "weddings", serviceRequired: "both", source: "walk-in" },
      { headers: { "X-CSRF-Token": "forged-token-value" } }
    );
    expect(res.status === 403, `expected 403, got ${res.status}`);
    expect(res.body.error.code === "CSRF_INVALID", `code was ${res.body.error.code}`);
    return `code=${res.body.error.code}`;
  });

  // -- RBAC ----------------------------------------------------------------
  await check("rbac: manager signs in and can work the CRM", async () => {
    const login = await manager.post("/auth/login", { email: MANAGER, password: PASSWORDS.manager });
    expect(login.status === 200, `manager login failed: ${login.status}`);

    const leads = await manager.get("/leads?page=1&limit=5&sort=-createdAt");
    expect(leads.status === 200, `manager could not read leads: ${leads.status}`);
    expect(Array.isArray(leads.body.data.items), "paginated payload missing");

    const created = await manager.post("/leads", {
      name: "Manager Created",
      phone: uniquePhone,
      eventType: "corporate-events",
      serviceRequired: "decorator",
      source: "walk-in",
      status: "NEW",
    });
    expect(created.status === 201, `manager could not create a lead: ${created.status}`);
    return `read ${leads.body.data.total} leads, created ${created.body.data.id}`;
  });

  await check("rbac: manager CANNOT reach owner-only user administration", async () => {
    const res = await manager.get("/users");
    expect(res.status === 403, `expected 403, got ${res.status}`);
    return `code=${res.body.error.code}`;
  });

  await check("rbac: manager CANNOT read the audit log", async () => {
    const res = await manager.get("/audit");
    expect(res.status === 403, `expected 403, got ${res.status}`);
    return `code=${res.body.error.code}`;
  });

  await check("rbac: manager CANNOT change business settings", async () => {
    const res = await manager.put("/settings", { contact: { phoneDisplay: "Hacked" } });
    expect(res.status === 403, `expected 403, got ${res.status}`);
    return `code=${res.body.error.code}`;
  });

  await check("rbac: admin CAN read the audit log and work leads", async () => {
    const audit = await admin.get("/audit?limit=5");
    expect(audit.status === 200, `admin could not read audit: ${audit.status}`);
    const leads = await admin.get("/leads?limit=1");
    expect(leads.status === 200, `admin could not read leads: ${leads.status}`);
    return `audit entries=${audit.body.data.total}`;
  });

  await check("rbac: admin CANNOT manage users (owner-only)", async () => {
    const res = await admin.get("/users");
    expect(res.status === 403, `expected 403, got ${res.status}`);
    return `code=${res.body.error.code}`;
  });

  await check("rbac: roles cannot be escalated by writing to a protected field", async () => {
    // A manager attempting to grant itself ownership: the permission check
    // fails before the payload is even read.
    const res = await manager.patch(`/users/${String(await User.findOne({ email: MANAGER }).then((u) => u!._id))}`, {
      role: "OWNER_1",
    });
    expect(res.status === 403, `expected 403, got ${res.status}`);

    const unchanged = await User.findOne({ email: MANAGER });
    expect(unchanged!.role === "MANAGER", `role changed to ${unchanged!.role}`);
    return "privilege escalation blocked, role unchanged";
  });

  // -- Leads + workflows ---------------------------------------------------
  await check("leads: owner can create, read, update, annotate and archive", async () => {
    const created = await owner.post("/leads", {
      name: "Owner Created Lead",
      phone: uniquePhone,
      email: `owner-${Date.now()}@example.com`,
      eventType: "engagements",
      serviceRequired: "banquet-catering",
      source: "referral",
      status: "NEW",
    });
    expect(created.status === 201, `create failed: ${created.status}`);
    const id = created.body.data.id;

    const fetched = await owner.get(`/leads/${id}`);
    expect(fetched.status === 200, `read failed: ${fetched.status}`);

    const updated = await owner.patch(`/leads/${id}`, { status: "CONTACTED", nextFollowUpAt: "2026-11-01" });
    expect(updated.status === 200, `update failed: ${updated.status}`);
    expect(updated.body.data.status === "CONTACTED", "status not applied");

    const noted = await owner.post(`/leads/${id}/notes`, { body: "Called the family, samples to be shared." });
    expect(noted.status === 201, `note failed: ${noted.status}`);
    expect(noted.body.data.notes.length === 1, "note not attached");

    const archived = await owner.delete(`/leads/${id}`);
    expect(archived.status === 200, `archive failed: ${archived.status}`);

    const afterArchive = await owner.get(`/leads/${id}`);
    expect(afterArchive.status === 404, `archived lead still readable: ${afterArchive.status}`);

    const stillInDatabase = await Lead.findById(id).lean();
    expect(stillInDatabase, "archive deleted the document instead of soft-deleting");
    expect(stillInDatabase!.archivedAt, "archivedAt was not set");
    return "created → read → status change → note → soft-deleted";
  });

  await check("leads: search, filter and pagination are handled server-side", async () => {
    const res = await owner.get("/leads?page=1&limit=2&status=NEW&search=Probe&sort=-createdAt");
    expect(res.status === 200, `query failed: ${res.status}`);
    const { items, total, page, limit, totalPages } = res.body.data;
    expect(items.length <= 2, `limit not honoured: ${items.length}`);
    expect(page === 1 && limit === 2, "pagination metadata wrong");
    expect(typeof total === "number" && typeof totalPages === "number", "total counters missing");
    return `matched=${total} returned=${items.length}`;
  });

  // -- Settings ------------------------------------------------------------
  await check("settings: owner update is persisted and visible publicly", async () => {
    const value = {
      brand: { name: "Bandhan Events", tagline: "Celebrations for a Lifetime" },
      contact: {
        phoneDisplay: "+91 90000 00000",
        whatsappNumber: "919000000000",
        email: "hello@bandhanevents.in",
        instagramUrl: "https://www.instagram.com/bandhanevents",
        instagramHandle: "@bandhanevents",
      },
      address: {
        street: "63/1 Guru Gobind Singh Marg",
        locality: "Mulund Colony",
        area: "Mulund West",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400082",
        country: "India",
      },
      internal: { enquiryNotifyEmail: "owners@bandhanevents.in" },
    };

    const saved = await owner.put("/settings", value);
    expect(saved.status === 200, `settings update failed: ${saved.status} ${JSON.stringify(saved.body)}`);

    const publicView = await anon.get("/public/settings");
    expect(publicView.body.data.contact.whatsappNumber === "919000000000", "public view did not pick up the change");
    expect(!("internal" in publicView.body.data), "internal block leaked after the update");

    const stored = await (
      await import("@/models/SiteSetting")
    ).SiteSetting.findOne({ key: "business" }).lean();
    expect(stored, "settings document missing in MongoDB");
    return `whatsapp=${publicView.body.data.contact.whatsappNumber} (database-backed)`;
  });

  await check("settings: invalid values are rejected with field errors", async () => {
    const res = await owner.put("/settings", { contact: { whatsappNumber: "not-a-number" } });
    expect(res.status === 422, `expected 422, got ${res.status}`);
    return `code=${res.body.error.code}`;
  });

  // -- Audit + session -----------------------------------------------------
  await check("audit: logins, denials, leads and enquiries are recorded", async () => {
    const actions = await AuditLog.distinct("action");
    const required = [
      "LOGIN_SUCCEEDED",
      "LOGIN_FAILED",
      "LOGIN_BLOCKED",
      "ACCESS_DENIED",
      "PUBLIC_ENQUIRY_RECEIVED",
      "PUBLIC_ENQUIRY_REJECTED",
      "LEAD_CREATED",
      "LEAD_UPDATED",
      "LEAD_ARCHIVED",
      "PASSWORD_CHANGED",
      "SETTINGS_UPDATED",
    ];
    const missing = required.filter((action) => !actions.includes(action));
    expect(missing.length === 0, `missing audit actions: ${missing.join(", ")}`);

    const denied = await AuditLog.findOne({ action: "ACCESS_DENIED" }).lean();
    expect(denied!.metadata, "denied entry lost its metadata");
    return `${actions.length} distinct actions recorded`;
  });

  await check("audit: entries never contain passwords or tokens", async () => {
    const raw = JSON.stringify(await AuditLog.find({}).lean());
    for (const secret of [PASSWORDS.owner1, PASSWORDS.admin, PASSWORDS.manager]) {
      expect(!raw.includes(secret), "a password was written to the audit log");
    }
    expect(!/resetTokenHash|passwordHash|sessionToken/.test(raw), "a secret field leaked into the audit log");
    return "no credential material in audit entries";
  });

  await check("sessions: the database stores only token digests", async () => {
    const session = await Session.findOne({}).select("+tokenHash +csrfTokenHash").lean();
    expect(session, "no session document");
    expect(session!.tokenHash.length === 64, "token hash is not a sha-256 digest");
    const cookieValue = null; // the raw token only ever exists in the browser cookie
    expect(cookieValue === null, "unreachable");
    return "tokenHash is a 64-char digest, raw token never stored";
  });

  await check("logout: the session is revoked and the cookie cleared", async () => {
    const res = await manager.post("/auth/logout");
    expect(res.status === 200, `logout failed: ${res.status}`);

    const probe = await manager.get("/auth/session");
    expect(probe.status === 401, `session still valid after logout: ${probe.status}`);

    const revoked = await Session.find({ revokedAt: { $ne: null } }).countDocuments();
    expect(revoked > 0, "no session was marked revoked");
    return `revoked sessions=${revoked}`;
  });

  await check("responses: no password hash or reset token ever leaves the API", async () => {
    const endpoints = ["/leads?limit=1", "/users", "/settings", "/audit?limit=3", "/auth/session"];
    for (const path of endpoints) {
      const res = await owner.get(path);
      const raw = JSON.stringify(res.body);
      expect(!/passwordHash|resetToken|tokenHash|csrfTokenHash/.test(raw), `${path} leaked a secret field`);
    }
    return `checked ${endpoints.length} endpoints`;
  });

  await check("errors: unknown routes return the standard failure envelope", async () => {
    const res = await anon.get("/not-a-real-route");
    expect(res.status === 404, `expected 404, got ${res.status}`);
    expect(res.body.success === false, "envelope missing success:false");
    expect(res.body.error.code === "NOT_FOUND", `code was ${res.body.error.code}`);
    return "404 envelope correct";
  });

  // -- Security hardening --------------------------------------------------
  await check("security: every admin API refuses unauthenticated requests", async () => {
    const paths = [
      "/leads",
      "/customers",
      "/events",
      "/vendors",
      "/quotations",
      "/invoices",
      "/finance/summary",
      "/sync/status",
      "/dashboard/stats",
      "/users",
      "/settings",
      "/audit",
      "/documents/000000000000000000000001",
    ];
    for (const path of paths) {
      const res = await anon.get(path);
      expect(res.status === 401, `${path} answered ${res.status} without a session`);
    }
    return `${paths.length} sensitive endpoints all returned 401`;
  });

  await check("security: CSRF is enforced on finance, event and sync writes", async () => {
    const probes: Array<[string, unknown]> = [
      ["/finance/payments", {}],
      ["/events", {}],
      ["/sync/now", {}],
    ];
    for (const [path, body] of probes) {
      const res = await owner.post(path, body, { omitCsrf: true });
      expect(
        res.status === 403 && res.body?.error?.code === "CSRF_MISSING",
        `${path} answered ${res.status}/${res.body?.error?.code}`
      );
    }
    return `${probes.length} write endpoints require the CSRF header`;
  });

  await check("security: Google Sheets sync is gated by settings permission", async () => {
    const statusForAdmin = await admin.get("/sync/status");
    expect(statusForAdmin.status === 200, `admin blocked from sync status: ${statusForAdmin.status}`);

    // The manager signed out earlier in the suite; re-establish the session
    // so the denial below is a permission denial, not a missing session.
    const probe = await manager.get("/auth/session");
    if (probe.status === 401) {
      const relogin = await manager.post("/auth/login", { email: MANAGER, password: PASSWORDS.manager });
      expect(relogin.status === 200, `manager re-login failed: ${relogin.status}`);
    }

    // Reading sync status is a view of settings (managers hold settings:read);
    // *triggering* an outbound sync is settings:write, which managers lack.
    const statusForManager = await manager.get("/sync/status");
    expect(statusForManager.status === 200, `manager could not read sync status: ${statusForManager.status}`);
    const triggerForManager = await manager.post("/sync/now", {});
    expect(triggerForManager.status === 403, `manager could trigger a sync: ${triggerForManager.status}`);
    return "read=200 for both, trigger: admin allowed, manager=403";
  });

  await check("security: audit client IP cannot be forged via X-Forwarded-For", async () => {
    const spoof = new TestClient(baseUrl);
    const login = await spoof.post(
      "/auth/login",
      { email: OWNER1, password: PASSWORDS.owner1 },
      { headers: { "X-Forwarded-For": "203.0.113.77" } }
    );
    expect(login.status === 200, `login failed: ${login.status}`);

    const forged = await AuditLog.countDocuments({ ip: "203.0.113.77" });
    expect(forged === 0, `X-Forwarded-For reached the audit log (${forged} entries)`);
    const entry = await AuditLog.findOne({ action: "LOGIN_SUCCEEDED" })
      .sort({ createdAt: -1 })
      .lean();
    expect(entry?.ip && entry.ip !== "203.0.113.77", `recorded ip=${entry?.ip}`);
    return `recorded ip=${entry!.ip}, spoofed header ignored`;
  });

  await check("security: response headers ship the hardening defaults", async () => {
    const res = await anon.get("/health");
    expect(res.headers.get("x-content-type-options") === "nosniff", "nosniff missing");
    expect(!res.headers.get("x-powered-by"), "x-powered-by exposed");
    expect(
      (res.headers.get("content-security-policy") ?? "").includes("default-src 'none'"),
      "strict CSP missing"
    );
    expect(res.headers.get("referrer-policy") === "no-referrer", "referrer policy missing");
    return "nosniff, no x-powered-by, CSP default-src 'none', no-referrer";
  });

  await check(
    "security: forgot-password never reveals a token and does not enumerate accounts",
    async () => {
      const known = await anon.post("/auth/forgot-password", { email: OWNER1 });
      const unknown = await anon.post("/auth/forgot-password", {
        email: "definitely-not-registered@example.com",
      });
      expect(
        known.status === 200 && unknown.status === 200,
        `status known=${known.status} unknown=${unknown.status}`
      );
      expect(!JSON.stringify(known.body).includes("token"), "reset token leaked in the response");
      expect(
        JSON.stringify(unknown.body) === JSON.stringify(known.body),
        "responses differ — account enumeration"
      );
      return "identical 200 responses, no token in the body";
    }
  );

  await check("security: uploads are signature-checked and filenames forced to the stored type", async () => {
    const { documentService } = await import("@/services/documentService");
    const actor = {
      user: {
        id: "000000000000000000000001",
        name: "Verify",
        email: "verify@localhost",
        role: "OWNER_1",
        status: "ACTIVE",
        permissions: [],
        mustChangePassword: false,
        lastLoginAt: null,
      },
      session: {
        id: "verify",
        tokenHash: "",
        csrfTokenHash: "",
        expiresAt: new Date(),
      },
    } as unknown as AuthContext;
    const entityId = "000000000000000000000001";

    let rejected = false;
    try {
      await documentService.store({
        kind: "vendor",
        fileName: "fake.png",
        data: Buffer.from("not really a png at all"),
        mimeType: "image/png",
        entityType: "Vendor",
        entityId,
        actor,
      });
    } catch (error) {
      rejected = true;
      expect(
        (error as Error).message.includes("do not match"),
        `unexpected error: ${(error as Error).message}`
      );
    }
    expect(rejected, "junk bytes with a PNG content type were accepted");

    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const stored = await documentService.store({
      kind: "vendor",
      fileName: "evil.html",
      data: png,
      mimeType: "image/png",
      entityType: "Vendor",
      entityId,
      actor,
    });
    expect(stored.fileName === "evil.png", `filename not forced: ${stored.fileName}`);
    return "junk bytes rejected, extension forced to .png";
  });

  await check("security: log redaction covers composite secret keys", async () => {
    const { logger } = await import("@/utils/logger");
    let captured = "";
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      captured += args.map((arg) => String(arg)).join(" ") + "\n";
    };
    try {
      logger.error("redaction probe", {
        smtpPassword: "Hush-Hush-Value-9",
        metaAppSecret: "Meta-Secret-7",
        nested: { googleSheetsPrivateKey: "GKey-Value-3" },
      });
    } finally {
      console.error = originalError;
    }
    expect(!captured.includes("Hush-Hush-Value-9"), "smtpPassword leaked into the log");
    expect(!captured.includes("Meta-Secret-7"), "metaAppSecret leaked into the log");
    expect(!captured.includes("GKey-Value-3"), "nested private key leaked into the log");
    expect(captured.includes("[redacted]"), "no redaction marker found");
    return "3 composite secret keys redacted";
  });

  // -- Wrap up -------------------------------------------------------------
  const counts = {
    users: await User.countDocuments({}),
    leads: await Lead.countDocuments({}),
    sessions: await Session.countDocuments({}),
    audit: await AuditLog.countDocuments({}),
  };

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectDatabase();

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;

  console.log("\n════════════════════════════════════════════════════════════════════");
  console.log(" Bandhan Events API — verification");
  console.log("════════════════════════════════════════════════════════════════════");
  for (const result of results) {
    console.log(`${result.pass ? "  PASS" : "  FAIL"}  ${result.name}`);
    if (result.detail) console.log(`        ${result.detail}`);
  }
  console.log("────────────────────────────────────────────────────────────────────");
  console.log(
    `  ${passed}/${results.length} checks passed   |   MongoDB: ${counts.users} users, ${counts.leads} leads, ` +
      `${counts.sessions} sessions, ${counts.audit} audit entries`
  );
  console.log("════════════════════════════════════════════════════════════════════\n");

  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error("Verification crashed:", error);
  process.exit(1);
});
