import { notFound } from "next/navigation";
import { getChatGPTUser } from "../chatgpt-auth";

export async function requireOwner() {
  const user = await getChatGPTUser();
  const allowedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!user || !allowedEmail || user.email.toLowerCase() !== allowedEmail) notFound();
  return user;
}

export async function isOwner() {
  const user = await getChatGPTUser();
  const allowedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(user && allowedEmail && user.email.toLowerCase() === allowedEmail);
}
