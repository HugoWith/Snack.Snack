import { AuthApiError, type AuthError } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { sendLoginLink } from "../../src/lib/admin-login";

const authReturning = (error: AuthError | null) => ({
  signInWithOtp: vi.fn(async () =>
    error
      ? { data: { user: null, session: null }, error }
      : { data: { user: null, session: null }, error: null },
  ),
});

describe("sendLoginLink", () => {
  it("never creates an account and comes back to /admin", async () => {
    const auth = authReturning(null);

    expect(
      await sendLoginLink(auth, "hugo@mail.fr", "http://localhost:8888/admin"),
    ).toBe("sent");
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "hugo@mail.fr",
      options: {
        shouldCreateUser: false,
        emailRedirectTo: "http://localhost:8888/admin",
      },
    });
  });

  it.each(["otp_disabled", "user_not_found"])(
    "answers an unknown address (%s) like a known one",
    async (code) => {
      const auth = authReturning(
        new AuthApiError("Signups not allowed for otp", 422, code),
      );

      expect(await sendLoginLink(auth, "x@mail.fr", "/admin")).toBe("sent");
    },
  );

  it("reports an account that was never confirmed", async () => {
    const auth = authReturning(
      new AuthApiError(
        "Signups not allowed for this instance",
        422,
        "signup_disabled",
      ),
    );

    expect(await sendLoginLink(auth, "x@mail.fr", "/admin")).toBe("failed");
  });

  it("reports any other failure", async () => {
    const auth = authReturning(
      new AuthApiError("Rate limit", 429, "over_email_send_rate_limit"),
    );

    expect(await sendLoginLink(auth, "x@mail.fr", "/admin")).toBe("failed");
  });
});
