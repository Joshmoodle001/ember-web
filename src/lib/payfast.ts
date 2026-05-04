import crypto from "crypto";

const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || "10000100";
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY || "";
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || "";
const PAYFAST_BASE_URL = process.env.NODE_ENV === "production"
  ? "https://www.payfast.co.za/eng/process"
  : "https://sandbox.payfast.co.za/eng/process";

export interface PayFastPaymentData {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  name_first: string;
  name_last: string;
  email_address: string;
  cell_number?: string;
  m_payment_id: string;
  amount: string;
  item_name: string;
  item_description?: string;
  custom_str1?: string;
  custom_str2?: string;
  custom_str3?: string;
  custom_int1?: number;
  custom_int2?: number;
  custom_int3?: number;
  subscription_type?: string;
  billing_date?: string;
  recurring_amount?: string;
  billing_cycle?: string;
  cycles?: number;
  signature: string;
}

function generateSignature(data: Record<string, string | number | undefined>): string {
  const sortedEntries = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== "")
    .sort(([a], [b]) => a.localeCompare(b));

  let signatureString = sortedEntries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
  if (PAYFAST_PASSPHRASE) {
    signatureString += `&passphrase=${encodeURIComponent(PAYFAST_PASSPHRASE)}`;
  }

  return crypto.createHash("md5").update(signatureString).digest("hex");
}

export function createPayFastPayment(params: {
  clientName: string;
  clientEmail: string;
  amount: number;
  itemName: string;
  itemDescription?: string;
  projectId?: string;
  paymentId?: string;
}): { url: string; data: PayFastPaymentData } {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ember-web-futuristic.vercel.app";

  const paymentData: Record<string, string | number | undefined> = {
    merchant_id: PAYFAST_MERCHANT_ID,
    merchant_key: PAYFAST_MERCHANT_KEY,
    return_url: `${baseUrl}/admin/payments?status=success`,
    cancel_url: `${baseUrl}/admin/payments?status=cancel`,
    notify_url: `${baseUrl}/api/payfast/notify`,
    name_first: params.clientName.split(" ")[0] || "Client",
    name_last: params.clientName.split(" ").slice(1).join(" ") || "",
    email_address: params.clientEmail,
    m_payment_id: params.paymentId || crypto.randomUUID(),
    amount: params.amount.toFixed(2),
    item_name: params.itemName,
    item_description: params.itemDescription,
    custom_str1: params.projectId,
  };

  paymentData.signature = generateSignature(paymentData);

  return {
    url: PAYFAST_BASE_URL,
    data: paymentData as unknown as PayFastPaymentData,
  };
}

export function verifyPayFastSignature(data: Record<string, string>): boolean {
  const receivedSignature = data.signature;
  if (!receivedSignature) return false;

  const dataToVerify = { ...data };
  delete dataToVerify.signature;

  const expectedSignature = generateSignature(dataToVerify);
  return receivedSignature === expectedSignature;
}

export function verifyPayFastNotify(headers: Record<string, string | undefined>): boolean {
  if (process.env.NODE_ENV === "production") {
    const pfHost = headers["x-forwarded-host"] || headers["host"] || "";
    if (!pfHost.includes("payfast.co.za")) return false;
  }
  return true;
}