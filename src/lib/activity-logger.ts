import { supabaseAdmin } from "@/lib/supabase-admin";

export async function logActivity(
  action: string,
  entityType: string,
  entityId?: string,
  description?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabaseAdmin.from("activity_log").insert([{
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      description: description || null,
      metadata: metadata || null,
    }]);
  } catch (e) {
    console.error("Activity log error:", e);
  }
}