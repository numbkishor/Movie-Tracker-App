import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * POST only. A GET sign-out can be triggered by any image tag or prefetch on a
 * page the user visits, which makes signing out a drive-by action.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const signInUrl = request.nextUrl.clone();
  signInUrl.pathname = "/sign-in";
  signInUrl.search = "";

  return NextResponse.redirect(signInUrl, { status: 303 });
}
