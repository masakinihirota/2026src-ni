import type { MetadataRoute } from "next";

const PUBLIC_ROUTES = [
  "/",
  "/dashboard",
  "/login",
  "/materials",
  "/overview",
  "/sitemap",
  "/trial",
  "/units",
  "/units/chat",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() || "http://localhost:3000";
  const now = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
  }));
}
