import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptToken } from "./crypto";

/** Fields needed to insert/update an `accounts` row. */
interface UpsertAccountInput {
  user_id: string;
  ig_id: string;
  ig_username: string;
  access_token: string;
  token_expires_at?: string;
}

/**
 * Upsert an Instagram account, merging on the `ig_id` unique constraint so a
 * reconnect updates the existing row instead of inserting a duplicate. Pass the
 * service-role client the caller already holds (getServiceClient()).
 */
export async function upsertAccount(
  supabase: SupabaseClient,
  data: UpsertAccountInput
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("accounts")
    .upsert({ ...data, access_token: encryptToken(data.access_token) }, { onConflict: "ig_id" });

  if (error) {
    console.error("[accounts] upsert failed:", error.message);
    return { error: error.message };
  }

  return {};
}
