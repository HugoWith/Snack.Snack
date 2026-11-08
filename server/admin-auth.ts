import { createClient } from "@supabase/supabase-js";
import type { Deps } from "./app";

export const parseAdminEmails = (raw: string): string[] =>
  raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email !== "");

// getUser asks Supabase Auth to validate the token, so a forged or revoked
// session is refused even when its JWT still looks well-formed.
export const createVerifyAdmin = ({
  supabaseUrl,
  anonKey,
  adminEmails,
}: {
  supabaseUrl: string;
  anonKey: string;
  adminEmails: string[];
}): Deps["verifyAdmin"] => {
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const allowed = new Set(adminEmails.map((email) => email.toLowerCase()));

  return async (authHeader) => {
    const token = authHeader?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) return null;

    const { data, error } = await supabase.auth.getUser(token);
    const email = data.user?.email?.toLowerCase();
    if (error || !email || !allowed.has(email)) return null;
    return { email };
  };
};
