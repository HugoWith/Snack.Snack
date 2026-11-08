import { useState, type FormEvent } from "react";
import { sendLoginLink } from "../../lib/admin-login";
import { EMAIL_PATTERN } from "../../lib/order";
import { supabase } from "../../lib/supabase-client";

type LoginState =
  | { status: "idle" | "sending" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

export const useLogin = () => {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<LoginState>({ status: "idle" });

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(address)) {
      setState({ status: "error", message: LOGIN_COPY.invalidEmail });
      return;
    }

    setState({ status: "sending" });
    const result = await sendLoginLink(
      supabase.auth,
      address,
      `${window.location.origin}/admin`,
    );
    setState(
      result === "sent"
        ? { status: "sent", email: address }
        : { status: "error", message: LOGIN_COPY.failed },
    );
  };

  return { email, setEmail, state, handleSubmit };
};

export const LOGIN_COPY = {
  invalidEmail: "Cette adresse n'a pas l'air complète.",
  failed: "Le lien n'est pas parti. Réessaie dans une minute.",
  sent: (email: string): string =>
    `Si ${email} a accès à l'admin, le lien arrive dans ta boîte. Ouvre-le sur cet appareil.`,
} as const;
