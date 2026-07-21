import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_AUTH_COOKIE_NAME, getAdminHiddenPath } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const expectedSlug = getAdminHiddenPath();
  const redirectUrl = new URL(expectedSlug ? `/${expectedSlug}` : "/", request.url);
  redirectUrl.searchParams.set("loggedOut", "1");

  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_AUTH_COOKIE_NAME);

  return NextResponse.redirect(redirectUrl);
}
