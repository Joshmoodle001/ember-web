import type { Metadata } from "next";
import InvoicePayment from "@/components/invoice-payment";

export const metadata: Metadata = {
  title: "Secure EmberWeb invoice",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InvoicePayment token={token} />;
}
