import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@emberweb.co.za";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme123456";