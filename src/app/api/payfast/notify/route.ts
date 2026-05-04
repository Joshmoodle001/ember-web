
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyPayFastSignature } from "@/lib/payfast";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let data: Record<string, string>;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      data = Object.fromEntries(params.entries());
    } else {
      data = await request.json();
    }

    const isValid = verifyPayFastSignature(data);
    if (!isValid) {
      console.error("PayFast ITN: Invalid signature");
      return new Response("INVALID_SIGNATURE", { status: 400 });
    }

    const mPaymentId = data.m_payment_id;
    const pfPaymentId = data.pf_payment_id;
    const paymentStatus = data.payment_status;
    const amount = parseFloat(data.amount_gross || "0");
    const itemName = data.item_name || "";
    const clientName = data.name_first && data.name_last ? `${data.name_first} ${data.name_last}`.trim() : "";
    const clientEmail = data.email_address || "";

    if (!mPaymentId) {
      console.error("PayFast ITN: Missing m_payment_id");
      return new Response("MISSING_PAYMENT_ID", { status: 400 });
    }

    const { data: existingPayment, error: fetchError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", mPaymentId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("PayFast ITN: DB fetch error", fetchError);
    }

    const statusMap: Record<string, string> = {
      COMPLETE: "complete",
      FAILED: "failed",
      PENDING: "pending",
      CANCELLED: "refunded",
    };

    const mappedStatus = statusMap[paymentStatus] || "pending";

    if (existingPayment) {
      await supabaseAdmin
        .from("payments")
        .update({
          status: mappedStatus,
          payfast_payment_id: pfPaymentId,
          payfast_data: data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mPaymentId);
    } else {
      await supabaseAdmin.from("payments").insert([{
        id: mPaymentId,
        amount,
        currency: "ZAR",
        status: mappedStatus,
        payfast_payment_id: pfPaymentId,
        payfast_data: data,
        notes: `${itemName} - ${clientName} (${clientEmail})`,
      }]);
    }

    if (mappedStatus === "complete" && data.custom_str1) {
      const { data: projectPayments } = await supabaseAdmin
        .from("payments")
        .select("amount")
        .eq("project_id", data.custom_str1)
        .eq("status", "complete");

      const totalPaid = (projectPayments || []).reduce((sum: number, p: { amount: string | number }) => sum + Number(p.amount), 0);
      await supabaseAdmin
        .from("projects")
        .update({ paid: totalPaid })
        .eq("id", data.custom_str1);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("PayFast ITN error:", error);
    return new Response("SERVER_ERROR", { status: 500 });
  }
}