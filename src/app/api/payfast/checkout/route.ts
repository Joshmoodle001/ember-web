import { NextResponse } from "next/server";
import { createPayFastPayment } from "@/lib/payfast";

export async function POST(request: Request) {
  try {
    const { clientName, clientEmail, amount, itemName, itemDescription, projectId, paymentId } = await request.json();

    if (!clientName || !clientEmail || !amount) {
      return NextResponse.json({ error: "clientName, clientEmail, and amount are required" }, { status: 400 });
    }

    const payment = createPayFastPayment({
      clientName,
      clientEmail,
      amount: Number(amount),
      itemName: itemName || "Ember Web Services",
      itemDescription,
      projectId,
      paymentId,
    });

    return NextResponse.json({
      url: payment.url,
      data: payment.data,
    });
  } catch (error) {
    console.error("PayFast checkout error:", error);
    return NextResponse.json({ error: "Failed to create PayFast checkout" }, { status: 500 });
  }
}