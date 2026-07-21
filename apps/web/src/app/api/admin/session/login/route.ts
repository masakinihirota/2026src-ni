import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_AUTH_COOKIE_NAME, createAdminSessionValue, getAdminHiddenPath, isAdminPasswordValid } from "@/lib/admin-auth";

function buildAdminUrl(request: Request, slug: string): URL {
  return new URL(`/${slug}`, request.url);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const requestedSlug = String(formData.get("adminSlug") ?? "").trim().replace(/^\/+|\/+$/g, "");
  const password = String(formData.get("password") ?? "");

  const expectedSlug = getAdminHiddenPath();
  if (!expectedSlug || requestedSlug !== expectedSlug) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const redirectUrl = buildAdminUrl(request, expectedSlug);

  if (!isAdminPasswordValid(password)) {
    redirectUrl.searchParams.set("error", "invalid_password");
    return NextResponse.redirect(redirectUrl);
  }

  const sessionValue = createAdminSessionValue();
  if (!sessionValue) {
    redirectUrl.searchParams.set("error", "not_configured");
    return NextResponse.redirect(redirectUrl);
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_AUTH_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return NextResponse.redirect(redirectUrl);
}
