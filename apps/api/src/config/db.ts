import mongoose from "mongoose";
// Side-effect import: registers every schema so `populate()` resolves `ref:`
// regardless of which repository loads first. See models/index.ts.
import "@/models";
import { env, isProduction, isTest } from "@/config/env";
import { logger } from "@/utils/logger";

/**
 * ---------------------------------------------------------------------------
 * DATABASE
 * ---------------------------------------------------------------------------
 * Production and staging connect to MONGODB_URI (MongoDB Atlas or a managed
 * instance). For local development and automated verification, an in-memory
 * MongoDB is started on demand so a real database engine — not a mock — backs
 * every test. That path is refused in production.
 */

let memoryServer: { getUri: () => string; stop: () => Promise<boolean> } | null = null;

async function resolveUri(): Promise<string> {
  if (env.MONGODB_URI && !env.USE_IN_MEMORY_DB) return env.MONGODB_URI;

  if (isProduction) {
    throw new Error("MONGODB_URI is required in production.");
  }

  // mongodb-memory-server is a dev dependency; load it only when needed.
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const instance = await MongoMemoryServer.create({
    instance: { dbName: "bandhan-events" },
  });
  memoryServer = instance as unknown as typeof memoryServer;
  const uri = instance.getUri();
  logger.warn("Using in-memory MongoDB for local development", { uri });
  return uri;
}

export async function connectDatabase(): Promise<string> {
  const uri = await resolveUri();

  mongoose.set("strictQuery", true);
  // Fail fast rather than buffering commands forever when the database is down.
  mongoose.set("bufferCommands", false);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 10,
  });

  if (!isTest) {
    logger.info("Connected to MongoDB", { database: mongoose.connection.name });
  }

  mongoose.connection.on("error", (error) => {
    logger.error("MongoDB connection error", { message: (error as Error).message });
  });
  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  return uri;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close(false);
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

/** Health-check helper for /health and readiness reporting. */
export function databaseState(): string {
  const states: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return states[mongoose.connection.readyState] ?? "unknown";
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}
