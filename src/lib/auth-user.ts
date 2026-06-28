import { createClient } from "@/lib/supabase/server";

/**
 * Resolve the current user id via the standard Supabase client + getUser().
 *
 * The earlier hand-rolled JWT-cookie parser existed to dodge a GoTrue 405
 * ("Unsupported request - method type: get"). Investigation (commit f06c402)
 * showed the real cause was a broken production build blocking deploy, not the
 * auth code — middleware already drives getSession()/GoTrue successfully, so the
 * parser was unnecessary and has been removed in favor of the standard path.
 *
 * Safe to call from Server Components and Route Handlers (both read cookies via
 * next/headers). Returns null when there is no session or getUser() fails.
 */
export async function getServerUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
