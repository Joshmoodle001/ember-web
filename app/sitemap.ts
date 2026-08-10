import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://emberweb.co.za";
  return ["", "/work", "/packages", "/audit", "/process", "/industries", "/care", "/start", "/policies"].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: "monthly", priority: path === "" ? 1 : 0.7 }));
}
