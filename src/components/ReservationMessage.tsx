import { ContactLine } from "./ContactLine";
import { CTA_CLASSES } from "./cta-classes";
import { StatusMessage } from "./StatusMessage";

export type MessageState =
  "poll" | "timeout" | "failed" | "refund" | "unreachable";

interface ReservationMessageProps {
  state: MessageState;
}

export function ReservationMessage({ state }: ReservationMessageProps) {
  const title = RESERVATION_COPY[state];

  if (state === "timeout") return <StatusMessage tone="text" title={title} />;
  if (state === "refund")
    return (
      <StatusMessage title={title}>
        <ContactLine />
      </StatusMessage>
    );
  if (state === "failed")
    return (
      <StatusMessage title={title}>
        <a href="/" className={`${CTA_CLASSES} max-w-[400px]`}>
          Retour à la billetterie
        </a>
      </StatusMessage>
    );
  return <StatusMessage title={title} />;
}

export const RESERVATION_COPY: Record<MessageState, string> = {
  poll: "On vérifie le paiement…",
  timeout:
    "Le paiement met du temps à arriver. Si ton paiement passe, on t'envoie ton billet par email.",
  failed: "Le paiement n'est pas passé.",
  refund: "On a un souci de place. On te recontacte très vite.",
  unreachable: "Le billet ne répond pas. Réessaie dans une minute.",
};
