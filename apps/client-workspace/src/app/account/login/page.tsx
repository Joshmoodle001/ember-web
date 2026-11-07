import { redirect } from "next/navigation";
import { legacyClientLoginPath } from "@/lib/login-destination";

export default async function ClientLoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string | string[]; register?: string | string[] }>;
}) {
  redirect(legacyClientLoginPath(await searchParams));
}
