import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/solana/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["/", "/security", "/changelog", "/auditor-key"].map((path) => ({ url: `${APP_URL}${path}`, lastModified: now }));
}
