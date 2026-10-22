import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { EDITORIAL_PREVIEW } from "@/lib/editorial";

export default function robots(): MetadataRoute.Robots {
  if (EDITORIAL_PREVIEW) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${SITE.url}/sitemap.xml` };
}
