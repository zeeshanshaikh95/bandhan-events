import {
  BUDGET_RANGES,
  EVENT_TYPES,
  SERVICES,
  stageChoiceLines,
  type EnquiryInput,
} from "@bandhan/shared";

/**
 * ---------------------------------------------------------------------------
 * ENQUIRY -> WHATSAPP MESSAGE
 * ---------------------------------------------------------------------------
 * Kept out of <EnquiryForm /> so the component module stays a pure component
 * (Vite fast-refresh friendly) and so the exact wording of the message is
 * reviewable and testable on its own.
 *
 * Deliberately free of React and of any network concern: it turns validated
 * answers into one string. Building the wa.me link is the caller's job, because
 * the business number comes from owner-editable settings.
 */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** `YYYY-MM-DD` -> `14 Feb 2027`. Split by hand so no timezone can shift a day. */
export function formatEventDate(value: string): string {
  const [year, month, day] = value.split("-");
  const name = MONTHS[Number(month) - 1];
  return year && name && day ? `${Number(day)} ${name} ${year}` : value;
}

/** Turns a stored slug into the label the visitor actually saw. */
function labelFor(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/**
 * Sanitises free text for a chat message.
 *
 * The shared `enquirySchema` strips every control character, newlines included
 * — correct for a value stored in a database, but wrong here: a visitor's
 * paragraphs would arrive glued together ("the date.", "We also need…" becoming
 * "the date.We also need…"). Line breaks survive; every other control
 * character is still removed, and trimming keeps the 1000-character ceiling
 * the schema already enforced.
 */
export function sanitizeMessageText(value: string): string {
  return value.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim();
}

/**
 * The enquiry as a WhatsApp message.
 *
 * Fields the visitor left blank are omitted rather than shown empty, so the
 * chat stays readable. WhatsApp renders `*like this*` as bold, which is why the
 * field names carry asterisks. A stage-builder configuration is appended
 * through the shared `stageChoiceLines` helper, so the message, the dashboard
 * and any future document describe the same configuration identically.
 */
export function buildEnquiryMessage(values: EnquiryInput): string {
  const lines: [string, string | undefined][] = [
    ["Name", values.name],
    ["Phone", values.phone],
    ["Email", values.email],
    ["Event Type", labelFor(EVENT_TYPES, values.eventType)],
    ["Event Date", values.eventDate ? formatEventDate(values.eventDate) : undefined],
    ["Guest Count", values.guestCount ? String(values.guestCount) : undefined],
    ["Service Required", labelFor(SERVICES, values.serviceRequired)],
    ["Budget", values.budget ? labelFor(BUDGET_RANGES, values.budget) : undefined],
  ];

  const parts = [
    "Hello Bandhan Events, I would like to enquire about an event.",
    "",
    ...lines.filter(([, value]) => value).map(([label, value]) => `*${label}:* ${value}`),
  ];

  if (values.message?.trim()) {
    parts.push("", "*Message:*", values.message.trim());
  }

  if (values.stageConfiguration) {
    parts.push(
      "",
      "*Stage Configuration:*",
      ...stageChoiceLines(values.stageConfiguration).map((line) => `- ${line.label}: ${line.value}`)
    );
  }

  parts.push("", "I look forward to hearing from you.");
  return parts.join("\n");
}
