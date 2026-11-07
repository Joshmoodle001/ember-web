import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { createWhatsAppDraft, getIndustry } from "@/lib/outreach";
import { getOutreachProduct } from "@/lib/products";

export async function prepareOutreach() {
  const service = createServiceClient();
  const [prospects, preparations] = await Promise.all([
    service.from("outreach_prospects").select("id,business_name,industry,product_key,updated_at").is("archived_at", null).in("permission_status", ["opted_in", "existing_customer"]).in("status", ["research", "ready"]).order("updated_at", { ascending: false }).limit(250),
    service.from("outreach_preparations").select("prospect_id,source_updated_at").limit(1000),
  ]);
  if (prospects.error || preparations.error) throw new Error("Outreach preparation storage is unavailable.");
  const previous = new Map((preparations.data ?? []).map((row) => [row.prospect_id, row.source_updated_at]));
  const records = (prospects.data ?? []).filter((row) => previous.get(row.id) !== row.updated_at).slice(0, 50).map((row) => {
    const profile = getIndustry(row.industry);
    const product = getOutreachProduct(row.product_key);
    return { prospect_id: row.id, source_updated_at: row.updated_at, prepared_at: new Date().toISOString(), message: createWhatsAppDraft(row.business_name, row.industry, "", product.id), concept_summary: { productKey: product.id, headline: product.id === "biosync" ? product.name : profile.headline, suggestedApp: product.id === "biosync" ? product.summary : profile.need, features: product.id === "biosync" ? product.capabilities : profile.features, illustrative: true, requiresHumanReview: true } };
  });
  if (records.length) {
    const { error } = await service.from("outreach_preparations").upsert(records, { onConflict: "prospect_id" });
    if (error) throw new Error("Drafts could not be prepared.");
  }
  return { prepared: records.length, messagesSent: 0, providerLookups: 0 };
}
