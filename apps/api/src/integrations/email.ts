import { env, isProduction } from "@/config/env";
import { logger } from "@/utils/logger";

/**
 * ---------------------------------------------------------------------------
 * EMAIL
 * ---------------------------------------------------------------------------
 * Provider-agnostic. `console` logs the message in development so the reset
 * flow can be completed locally; `smtp` is declared but not implemented until
 * real credentials exist.
 *
 * The important rule: an email is only reported as delivered when a provider
 * actually accepted it. Nothing here ever returns `delivered: true` for a
 * provider that did not send.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailResult {
  delivered: boolean;
  provider: string;
  /** Why delivery did not happen — surfaced in logs, never to end users. */
  reason?: string;
}

export interface EmailProvider {
  name: string;
  configured: boolean;
  send(message: EmailMessage): Promise<EmailResult>;
  statusNote: string;
}

const consoleProvider: EmailProvider = {
  name: "console",
  configured: true,
  statusNote: "Development logging provider — messages are logged, not emailed.",
  async send(message) {
    logger.info("Email (console provider, not actually sent)", {
      to: message.to,
      subject: message.subject,
      // The body is printed in development only; production logs stay clean.
      body: isProduction ? undefined : message.text,
    });
    return { delivered: false, provider: "console", reason: "console_provider" };
  },
};

const smtpProvider: EmailProvider = {
  name: "smtp",
  configured: Boolean(env.SMTP_HOST && env.SMTP_PORT),
  statusNote: Boolean(env.SMTP_HOST && env.SMTP_PORT)
    ? "SMTP credentials present, but the SMTP transport is not implemented yet."
    : "SMTP is not configured (set SMTP_HOST/SMTP_PORT to enable).",
  async send() {
    // Deliberately unimplemented: pretending to send is worse than refusing.
    return {
      delivered: false,
      provider: "smtp",
      reason: "smtp_transport_not_implemented",
    };
  },
};

const providers: Record<string, EmailProvider> = { console: consoleProvider, smtp: smtpProvider };

export function emailProvider(): EmailProvider {
  return providers[env.EMAIL_PROVIDER] ?? consoleProvider;
}

export const emailService = {
  provider: emailProvider,

  async send(message: EmailMessage): Promise<EmailResult> {
    return emailProvider().send(message);
  },

  /**
   * Returns the result so callers/tests can see whether anything was really
   * delivered. The reset endpoint never tells the caller either way.
   */
  async sendPasswordReset(to: string, resetUrl: string, name: string): Promise<EmailResult> {
    return this.send({
      to,
      subject: "Reset your Bandhan Events admin password",
      text: [
        `Hello ${name},`,
        "",
        "A password reset was requested for your Bandhan Events admin account.",
        `Open this link within 30 minutes to choose a new password:`,
        resetUrl,
        "",
        "If you did not request this, you can ignore this email — your password has not changed.",
      ].join("\n"),
    });
  },

  statusNote(): string {
    return emailProvider().statusNote;
  },
};
