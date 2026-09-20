import type { Server } from "node:http";
import { createApp } from "@/app";
import { connectDatabase, disconnectDatabase } from "@/config/db";
import { env, isProduction, usingEphemeralSessionSecret } from "@/config/env";
import { logger } from "@/utils/logger";

/**
 * Process entry point: connect the database, start the HTTP server, and shut
 * both down cleanly so in-flight requests finish and the connection pool is
 * released on redeploy.
 */
async function start(): Promise<void> {
  const uri = await connectDatabase();

  const app = createApp();
  const server: Server = app.listen(env.PORT, env.HOST, () => {
    // Read the bound port back: PORT=0 means the OS chose one for us.
    const address = server.address();
    const boundPort = typeof address === "object" && address ? address.port : env.PORT;
    logger.info("Bandhan Events API listening", {
      url: `http://${env.HOST}:${boundPort}/api/v1`,
      nodeEnv: env.NODE_ENV,
      database: uri.replace(/\/\/[^@]*@/, "//***@"), // credentials never logged
      sessionSecret: usingEphemeralSessionSecret ? "ephemeral (dev)" : "configured",
    });
  });

  // Large uploads and slow clients should not hold a socket forever.
  server.headersTimeout = 65_000;
  server.requestTimeout = 60_000;

  const shutdown = async (signal: string): Promise<void> => {
    logger.info("Shutting down", { signal });
    server.close(() => logger.info("HTTP server closed"));
    await disconnectDatabase();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", { reason: String(reason) });
    if (isProduction) void shutdown("unhandledRejection");
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", { message: error.message, stack: error.stack });
    void shutdown("uncaughtException");
  });
}

start().catch((error) => {
  logger.error("Failed to start API", { message: (error as Error).message });
  process.exit(1);
});
