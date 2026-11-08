import type { SupabaseClient } from "@supabase/supabase-js";

export type LoginLinkResult = "sent" | "failed";

type OtpAuth = Pick<SupabaseClient["auth"], "signInWithOtp">;

// Organiser accounts are created ahead of time, so the link never creates
// one. An unknown address gets the same answer as an organiser's: the form
// must not tell who has an account. An unconfirmed account comes back as
// signup_disabled and gets no email, so it is reported as a failure.
export const sendLoginLink = async (
  auth: OtpAuth,
  email: string,
  redirectTo: string,
): Promise<LoginLinkResult> => {
  const { error } = await auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
  });
  if (!error || UNKNOWN_ADDRESS_CODES.has(error.code ?? "")) return "sent";
  return "failed";
};

const UNKNOWN_ADDRESS_CODES = new Set(["otp_disabled", "user_not_found"]);
