import { redirect } from "next/navigation";

const packages = new Set(["launch-lite", "starter", "business", "growth"]);
const goals = new Set(["More enquiries & leads", "A stronger online presence", "Replacing an old website", "Launching something new"]);

export default async function StartPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const values = await searchParams;
  const destination = new URL("https://emberweb.co.za/start");
  if (typeof values.package === "string" && packages.has(values.package)) destination.searchParams.set("package", values.package);
  if (typeof values.goal === "string" && goals.has(values.goal)) destination.searchParams.set("goal", values.goal);
  redirect(destination.href);
}
