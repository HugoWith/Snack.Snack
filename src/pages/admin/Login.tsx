import {
  INPUT_CLASSES,
  LABEL_CLASSES,
  NOTICE_CLASSES,
  PRIMARY_BUTTON_CLASSES,
} from "./admin-classes";
import { AdminShell } from "./AdminShell";
import { LOGIN_COPY, useLogin } from "./useLogin";

export function Login() {
  const { email, setEmail, state, handleSubmit } = useLogin();
  const isSending = state.status === "sending";

  return (
    <AdminShell>
      <form
        noValidate
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-[400px] flex-col gap-6 pt-8 lg:pt-16"
      >
        <p className="text-base leading-snug font-bold text-label">
          Reçois un lien de connexion par email. Seuls les organisateurs ont
          accès.
        </p>
        <label className="flex flex-col gap-2">
          <span className={LABEL_CLASSES}>Ton email</span>
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            aria-invalid={state.status === "error"}
            aria-describedby="login-message"
            onChange={(event) => setEmail(event.target.value)}
            className={INPUT_CLASSES}
          />
        </label>
        <button
          type="submit"
          disabled={isSending}
          className={PRIMARY_BUTTON_CLASSES}
        >
          {isSending ? "Envoi…" : "Recevoir le lien"}
        </button>
        <p
          id="login-message"
          role="status"
          className={`${NOTICE_CLASSES} ${state.status === "error" ? "text-alert" : "text-text"}`}
        >
          {state.status === "sent" && LOGIN_COPY.sent(state.email)}
          {state.status === "error" && state.message}
        </p>
      </form>
    </AdminShell>
  );
}
