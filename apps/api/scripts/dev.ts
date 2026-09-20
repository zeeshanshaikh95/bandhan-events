/**
 * ---------------------------------------------------------------------------
 * LOCAL DEVELOPMENT SERVER
 * ---------------------------------------------------------------------------
 * Starts the API with a seeded account set, so the dashboard can be exercised
 * without a local MongoDB install. When MONGODB_URI is present it is used
 * instead — this script never silently ignores a real database.
 *
 * It assembles the app itself (rather than importing src/server.ts) because
 * the same database connection that was seeded must also serve the requests.
 * Passwords still come from the environment; nothing is hardcoded here, and an
 * in-memory database disappears when the process exits.
 *
 * Usage:
 *   SEED_OWNER1_PASSWORD='...' npm run dev:seeded
 */
process.env.NODE_ENV ??= "development";
process.env.USE_IN_MEMORY_DB ??= process.env.MONGODB_URI ? "false" : "true";
process.env.SESSION_SECRET ??= "dev-only-session-secret-change-me-0123456789abcdef";
process.env.COOKIE_SECURE ??= "false";

async function main(): Promise<void> {
  const [{ connectDatabase, disconnectDatabase }, { createApp }, { env }, { logger }, { seedDatabase }] =
    await Promise.all([
      import("@/config/db"),
      import("@/app"),
      import("@/config/env"),
      import("@/utils/logger"),
      import("./seed"),
    ]);

  await connectDatabase();
  await seedDatabase({ disconnect: false });

  const server = createApp().listen(env.PORT, env.HOST, () => {
    const address = server.address();
    const boundPort = typeof address === "object" && address ? address.port : env.PORT;
    logger.info("Bandhan Events API (dev, seeded) listening", {
      url: `http://${env.HOST}:${boundPort}/api/v1`,
    });
  });

  const shutdown = async (): Promise<void> => {
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((error) => {
  console.error(`Dev server failed to start: ${(error as Error).message}`);
  process.exit(1);
});
