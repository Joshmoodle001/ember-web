export function parseNewClient(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (input.action !== "create_client" || Object.keys(input).some((key) => !["action", "fullName", "email", "company"].includes(key))) return null;
  const name = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (input.company != null && typeof input.company !== "string") return null;
  const company = typeof input.company === "string" ? input.company.trim() : "";
  if (name.length < 2 || name.length > 160 || name.includes("\0") || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.includes("\0") || company.length > 180 || company.includes("\0")) return null;
  return { full_name: name, email, company: company || null };
}
