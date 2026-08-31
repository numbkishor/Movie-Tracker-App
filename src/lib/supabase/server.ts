import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";
import { readPublicSupabaseEnv } from "@/lib/supabase/env";

/**
 * Server client bound to the request's cookies, so queries run as the signed-in
 * user and RLS applies to them exactly as it does in the browser. This is the
 * only kind of Supabase client the app uses on the server — nothing here
 * bypasses RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = readPublicSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. The middleware refreshes the
          // session on every request, so it is safe to ignore here.
        }
      },
    },
  });
}
