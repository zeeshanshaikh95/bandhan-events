/**
 * ---------------------------------------------------------------------------
 * SEED
 * ---------------------------------------------------------------------------
 * Creates the four initial accounts and the default business settings.
 *
 * Security rules obeyed here:
 *   - passwords come from the environment, never from code;
 *   - no password is ever printed back to the console;
 *   - every seeded account starts with mustChangePassword = true, so the
 *     temporary credential is useless for anything except choosing a new one.
 *
 * Usage:
 *   SEED_OWNER1_PASSWORD='...' SEED_OWNER2_PASSWORD='...' \
 *   SEED_ADMIN_PASSWORD='...'  SEED_MANAGER_PASSWORD='...' npm run seed
 */
import { DEFAULT_BUSINESS_SETTINGS, ROLES, type Role } from "@bandhan/shared";
import { connectDatabase, disconnectDatabase } from "@/config/db";
import { env, isProduction } from "@/config/env";
import { User } from "@/models/User";
import { authService } from "@/services/authService";
import { settingService } from "@/services/settingService";
import { userRepository } from "@/repositories/userRepository";
import { passwordSchema } from "@bandhan/shared";
import type { AuthContext } from "@/types/auth";
import { logger } from "@/utils/logger";

interface SeedAccount {
  role: Role;
  name: string;
  email: string;
  password: string | undefined;
  envKey: string;
}

function accounts(): SeedAccount[] {
  return [
    {
      role: "OWNER_1",
      name: "Bhavesh",
      email: process.env.SEED_OWNER1_EMAIL || "bhavesh@gmail.com",
      password: process.env.SEED_OWNER1_PASSWORD,
      envKey: "SEED_OWNER1_PASSWORD",
    },
    {
      role: "OWNER_2",
      name: "Zakir",
      email: process.env.SEED_OWNER2_EMAIL || "zakir@gmail.com",
      password: process.env.SEED_OWNER2_PASSWORD,
      envKey: "SEED_OWNER2_PASSWORD",
    },
    {
      role: "ADMIN",
      name: "Admin",
      email: process.env.SEED_ADMIN_EMAIL || "admin-adminzee@gmail.com",
      password: process.env.SEED_ADMIN_PASSWORD,
      envKey: "SEED_ADMIN_PASSWORD",
    },
    {
      role: "MANAGER",
      name: "Manager",
      email: process.env.SEED_MANAGER_EMAIL || "manager1@gmail.com",
      password: process.env.SEED_MANAGER_PASSWORD,
      envKey: "SEED_MANAGER_PASSWORD",
    },
  ];
}

/** The seed script acts as the system itself, not as a signed-in person. */
function seedActor(role: Role): AuthContext {
  return {
    user: {
      id: "seed",
      name: "Seed script",
      email: "seed@localhost",
      role,
      status: "ACTIVE",
      permissions: [],
      mustChangePassword: false,
      lastLoginAt: null,
    },
    session: { id: "seed", tokenHash: "", csrfTokenHash: "", expiresAt: new Date() },
  };
}

/**
 * Seeds the accounts and the default settings.
 *
 * Exported so the local dev launcher can seed the same in-memory database it
 * is about to serve, instead of duplicating this logic.
 */
export async function seedDatabase({
  force = process.argv.includes("--force"),
  disconnect = true,
  quiet = false,
}: { force?: boolean; disconnect?: boolean; quiet?: boolean } = {}): Promise<void> {
  if (isProduction && !force) {
    throw new Error("Refusing to seed a production database. Re-run with --force if you are certain.");
  }

  if (disconnect) await connectDatabase();

  const results: Array<{ role: Role; email: string; action: string }> = [];
  const missing: string[] = [];

  for (const account of accounts()) {
    if (!account.password) {
      missing.push(account.envKey);
      continue;
    }

    const parsed = passwordSchema.safeParse(account.password);
    if (!parsed.success) {
      throw new Error(
        `${account.envKey} does not meet the password policy: ${parsed.error.issues
          .map((issue) => issue.message)
          .join(" ")}`
      );
    }

    const existing = await userRepository.findByEmailWithSecret(account.email);
    if (existing) {
      if (!force) {
        results.push({ role: account.role, email: account.email, action: "skipped (already exists)" });
        continue;
      }
      // --force re-issues the temporary credential without touching history.
      await authService.setTemporaryPassword(
        String(existing._id),
        account.password,
        seedActor(account.role),
        { ip: "127.0.0.1", requestId: "seed", userAgent: "seed-script" },
        true
      );
      results.push({ role: account.role, email: account.email, action: "password reset (--force)" });
      continue;
    }

    await authService.createUserWithPassword({
      name: account.name,
      email: account.email,
      role: account.role,
      password: account.password,
      mustChangePassword: true,
    });

    results.push({ role: account.role, email: account.email, action: "created (must change password)" });
  }

  await settingService.replaceBusinessSettings(
    {
      ...DEFAULT_BUSINESS_SETTINGS,
      contact: {
        ...DEFAULT_BUSINESS_SETTINGS.contact,
        phoneDisplay: process.env.BUSINESS_PHONE_DISPLAY || DEFAULT_BUSINESS_SETTINGS.contact.phoneDisplay,
        whatsappNumber: process.env.BUSINESS_WHATSAPP_NUMBER || DEFAULT_BUSINESS_SETTINGS.contact.whatsappNumber,
        email: process.env.BUSINESS_EMAIL || DEFAULT_BUSINESS_SETTINGS.contact.email,
        instagramUrl: process.env.BUSINESS_INSTAGRAM_URL || DEFAULT_BUSINESS_SETTINGS.contact.instagramUrl,
        instagramHandle:
          process.env.BUSINESS_INSTAGRAM_HANDLE || DEFAULT_BUSINESS_SETTINGS.contact.instagramHandle,
      },
      onlinePresence: {
        googleBusinessUrl:
          process.env.BUSINESS_GOOGLE_BUSINESS_URL ||
          DEFAULT_BUSINESS_SETTINGS.onlinePresence.googleBusinessUrl,
        justdialUrl:
          process.env.BUSINESS_JUSTDIAL_URL || DEFAULT_BUSINESS_SETTINGS.onlinePresence.justdialUrl,
      },
    },
    null
  );

  const totalUsers = await User.countDocuments({});
  if (disconnect) await disconnectDatabase();

  if (quiet) return;

  console.log("\nSeed complete");
  console.log(`  environment : ${env.NODE_ENV}`);
  console.log(`  accounts    : ${totalUsers} in database`);
  for (const result of results) {
    console.log(`  - ${result.role.padEnd(8)} ${result.email.padEnd(28)} ${result.action}`);
  }
  if (missing.length > 0) {
    console.log(`\n  Skipped accounts with no password supplied: ${missing.join(", ")}`);
    console.log("  Set them in .env (see .env.example) and re-run: npm run seed");
  }
  console.log(
    `\n  Every account must change its password on first sign-in. Roles available: ${ROLES.join(", ")}\n`
  );
}

// Only run the CLI when this file is the entry point (not when imported).
const isDirectRun = process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/seed.ts") ?? false;

if (isDirectRun) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error("Seed failed", { message: (error as Error).message });
      console.error(`\nSeed failed: ${(error as Error).message}\n`);
      process.exit(1);
    });
}
