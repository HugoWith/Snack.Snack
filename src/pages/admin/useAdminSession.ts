import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase-client";

export type AdminSession =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; email: string; token: string };

// supabase-js reads the magic link tokens from the URL on load, then keeps
// the session refreshed and reports every change here.
export const useAdminSession = (): AdminSession => {
  const [session, setSession] = useState<AdminSession>({ status: "loading" });

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, current) => {
      setSession(
        current
          ? {
              status: "signedIn",
              email: current.user.email ?? "",
              token: current.access_token,
            }
          : { status: "signedOut" },
      );
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return session;
};
