import { useState, type FormEvent } from "react";
import { addReservation, type AdminAdded } from "../../lib/admin-api";
import {
  validateAdminOrder,
  type AdminOrderInput,
} from "../../lib/admin-order";
import { formatTicketNo } from "../../lib/format";
import { ADMIN_ERROR_COPY } from "./admin-copy";

export type AddNotice = {
  message: string;
  isAlert: boolean;
  ticketUrl?: string;
};

export const useAddReservationForm = (token: string, onAdded: () => void) => {
  const [draft, setDraft] = useState<AdminOrderInput>(INITIAL_ORDER);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<AddNotice | null>(null);

  const hasEmail = draft.email.trim() !== "";
  const order: AdminOrderInput = {
    ...draft,
    fullName: draft.fullName.trim(),
    email: draft.email.trim(),
    sendEmail: hasEmail && draft.sendEmail,
  };
  const allErrors = validateAdminOrder(order);
  const errors = hasSubmitted ? allErrors : {};

  const update = (patch: Partial<AdminOrderInput>): void =>
    setDraft((current) => ({ ...current, ...patch }));

  // The email checkbox starts unchecked each time an email is typed in.
  const setEmail = (email: string): void =>
    update(email.trim() === "" ? { email, sendEmail: false } : { email });

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (isSubmitting) return;
    setHasSubmitted(true);
    if (Object.keys(allErrors).length > 0) return;

    setIsSubmitting(true);
    setNotice(null);
    const result = await addReservation(token, order);
    setIsSubmitting(false);
    if (!result.ok) {
      setNotice({ message: ADMIN_ERROR_COPY[result.error], isAlert: true });
      return;
    }

    setNotice(addedNotice(result.value, order.fullName));
    setDraft(INITIAL_ORDER);
    setHasSubmitted(false);
    onAdded();
  };

  return {
    values: draft,
    hasEmail,
    errors,
    isSubmitting,
    notice,
    update,
    setEmail,
    handleSubmit,
  };
};

const addedNotice = (added: AdminAdded, fullName: string): AddNotice => {
  const done = `${formatTicketNo(added.ticketNo)} ajouté pour ${fullName}`;
  const ticketUrl = `/billet?ref=${added.id}`;
  if (added.email === "sent")
    return {
      message: `${done}. L'email de confirmation est parti.`,
      isAlert: false,
      ticketUrl,
    };
  if (added.email === "failed")
    return {
      message: `${done}, mais l'email n'est pas parti. Envoie-lui le lien du billet.`,
      isAlert: true,
      ticketUrl,
    };
  return { message: `${done}.`, isAlert: false, ticketUrl };
};

const INITIAL_ORDER: AdminOrderInput = {
  fullName: "",
  email: "",
  covers: 1,
  vg: 0,
  paymentMethod: null,
  sendEmail: false,
};
