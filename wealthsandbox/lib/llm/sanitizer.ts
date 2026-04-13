// ─── PII Sanitizer ────────────────────────────────────────────────────────────
// Strips personally identifiable information before sending to LLM.
// Compliance: GLBA / FINRA — no NPI to external LLM.

const PII_FIELDS = new Set([
  "name",
  "firstName",
  "lastName",
  "email",
  "clerkId",
  "ssn",
  "accountNumber",
  "address",
  "phone",
  "fullName",
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeContext(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeContext);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (PII_FIELDS.has(key)) {
      // Replace with generic description
      if (key === "name" || key === "firstName" || key === "lastName" || key === "fullName") {
        result[key] = "the client";
      } else if (key === "email") {
        result[key] = "client@redacted.com";
      } else {
        result[key] = "[REDACTED]";
      }
    } else if (typeof value === "object") {
      result[key] = sanitizeContext(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
