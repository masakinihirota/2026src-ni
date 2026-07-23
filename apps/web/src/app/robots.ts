import type { MetadataRoute } from "next";

import { getAdminHiddenPath } from "@/lib/admin-auth";

export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/api/admin/",
    "/api/wishes/admin-summary",
    "/api/wishes/admin-data-source",
    "/api/chats/admin-summary",
  ];
  const adminHiddenPath = getAdminHiddenPath();
  if (adminHiddenPath) {
    disallow.push(`/${adminHiddenPath}`);
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
    ],
  };
}
