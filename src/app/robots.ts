import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/solana/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/security", "/changelog", "/auditor-key"], disallow: ["/app", "/api", "/join", "/claim", "/brand"] }],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
