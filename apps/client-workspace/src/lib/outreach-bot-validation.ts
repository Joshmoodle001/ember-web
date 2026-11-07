import { normalizePublicResearchPage, normalizeResearchUrl } from "./website-audit";
import type { BotProductKey, BotSourceKind } from "./outreach-bot";

export const botUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isBotRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function hasExactBotKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
type CampaignInput = {
  name: string; productKey: BotProductKey; industry: string; city: string;
  dailyLimit: number; maxSites: number; sources: Array<{ url: string; kind: BotSourceKind }>;
};
function cleanText(value: unknown, min: number, max: number) {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ");
  return text.length >= min && text.length <= max ? text : null;
}
export function parseBotCampaign(body: unknown): CampaignInput | null {
  if (!isBotRecord(body) || !hasExactBotKeys(body, ["name", "productKey", "industry", "city", "dailyLimit", "maxSites", "sources"])) return null;
  const name = cleanText(body.name, 2, 120);
  const industry = cleanText(body.industry, 0, 100);
  const city = cleanText(body.city, 0, 120);
  if (name === null || industry === null || city === null || (body.productKey !== "emberweb" && body.productKey !== "biosync")
    || typeof body.dailyLimit !== "number" || !Number.isInteger(body.dailyLimit) || body.dailyLimit < 1 || body.dailyLimit > 20
    || typeof body.maxSites !== "number" || !Number.isInteger(body.maxSites) || body.maxSites < 1 || body.maxSites > 20
    || !Array.isArray(body.sources) || body.sources.length < 1 || body.sources.length > 20) return null;
  const sources: CampaignInput["sources"] = [];
  const hosts = new Set<string>();
  for (const source of body.sources) {
    if (!isBotRecord(source) || !hasExactBotKeys(source, ["url", "kind"]) || typeof source.url !== "string" || (source.kind !== "business" && source.kind !== "directory")) return null;
    try {
      const url = source.kind === "business" ? normalizeResearchUrl(source.url) : normalizePublicResearchPage(source.url);
      const host = new URL(url).hostname.replace(/^www\./, "");
      if (hosts.has(host)) return null;
      hosts.add(host);
      sources.push({ url, kind: source.kind });
    } catch { return null; }
  }
  if (sources.filter((source) => source.kind === "business").length > body.maxSites) return null;
  return { name, productKey: body.productKey, industry, city, dailyLimit: body.dailyLimit, maxSites: body.maxSites, sources };
}
