import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, service, budget, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.log("Contact form submission:", { name, email, company, service, budget, message });
      return NextResponse.json({ success: true, message: "Message received!" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.from("contact_submissions").insert([
      {
        name,
        email,
        company: company || null,
        service: service || null,
        budget: budget || null,
        message,
        status: "new",
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
    }

    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("email", email)
      .single();

    if (!existingClient) {
      await supabase.from("clients").insert([{
        name,
        email,
        company: company || null,
        status: "lead",
        notes: message ? `Initial inquiry: ${message.substring(0, 200)}${message.length > 200 ? "..." : ""}` : null,
        access_token: Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10),
      }]);
    }

    return NextResponse.json({ success: true, message: "Message sent successfully!" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}