import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import { corsOrigins, env, isProduction } from "@/config/env";
import { authenticate } from "@/middleware/authenticate";
import { errorHandler, notFoundHandler } from "@/middleware/errorHandler";
import { requestContext } from "@/middleware/requestContext";
import { apiLimiter } from "@/middleware/rateLimit";
import { apiRouter } from "@/routes";
import { logger } from "@/utils/logger";

/**
 * ---------------------------------------------------------------------------
 * CORS
 * ---------------------------------------------------------------------------
 * Strict allow-list: an origin must be named in CORS_ORIGINS to receive a
 * response, and credentials (the session cookie) are only honoured for those
 * origins, so a random site cannot ride on an authenticated session.
 *
 * Loopback origins are accepted in development only, which keeps local tools
 * usable without weakening production.
 */
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin requests and server-to-server calls
  if (corsOrigins.includes(origin)) return true;
  if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // The callback error is intentionally a plain Error: the CORS middleware
    // turns it into a 500, and the error handler logs it without leaking.
    callback(null, isOriginAllowed(origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-Request-Id", "Accept"],
  exposedHeaders: ["X-Request-Id", "RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
  maxAge: 600,
};

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");

  // Only trust the proxy header when the deployment explicitly says so,
  // otherwise an attacker could spoof their IP and dodge rate limits.
  if (env.TRUST_PROXY) app.set("trust proxy", 1);

  app.use(
    helmet({
      // This origin serves JSON only, so the strictest CSP is correct here.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: "same-site" },
      referrerPolicy: { policy: "no-referrer" },
      hsts: isProduction ? { maxAge: 15552000, includeSubDomains: true } : false,
    })
  );

  app.use(cors(corsOptions));
  app.use(requestContext);
  // A 64 kB body cap: enquiry forms are small, and nothing legitimate needs more.
  app.use(express.json({ limit: "64kb" }));
  app.use(express.urlencoded({ extended: false, limit: "64kb" }));
  app.use(cookieParser());

  // Resolves the session cookie into req.auth (or leaves it undefined).
  app.use(authenticate);

  app.use("/api/v1", apiLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info("Express app assembled", {
    nodeEnv: env.NODE_ENV,
    corsOrigins: corsOrigins.length > 0 ? corsOrigins : ["(loopback only in development)"],
  });

  return app;
}
