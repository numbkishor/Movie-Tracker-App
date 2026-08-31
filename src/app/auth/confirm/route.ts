import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "email_change", "magiclink"];

function isAllowedType(value: string | null): value is EmailOtpType {
  return value !== null && (ALLOWED_TYPES as string[]).includes(value);
}

/** Landing point for the confirmation link Supabase emails on sign-up. */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  const redirectTo = request.nextUrl.clone();
  redirectTo.search = "";

  if (!tokenHash || !isAllowedType(type)) {
    redirectTo.pathname = "/sign-in";
    redirectTo.searchParams.set("error", "invalid-link");
    return NextResponse.redirect(redirectTo);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    redirectTo.pathname = "/sign-in";
    redirectTo.searchParams.set("error", "invalid-link");
    return NextResponse.redirect(redirectTo);
  }

  redirectTo.pathname = "/";
  return NextResponse.redirect(redirectTo);
}
