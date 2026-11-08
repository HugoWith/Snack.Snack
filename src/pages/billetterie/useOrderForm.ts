import { useEffect, useState, type FormEvent } from "react";
import { EVENT } from "../../event";
import { createCheckout, type CheckoutError } from "../../lib/api";
import {
  ORDER_COPY,
  clampCovers,
  clampVg,
  orderTotalCents,
  validateOrder,
  type OrderErrors,
  type OrderInput,
} from "../../lib/order";

type Field = keyof OrderErrors;

export const useOrderForm = (seatsLeft: number, onSoldOut: () => void) => {
  const [draft, setDraft] = useState<OrderInput>(INITIAL_ORDER);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  // Back from SumUp, iOS restores the page from bfcache with the button still
  // on « PAIEMENT… »: the redirect never resets it.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent): void => {
      if (event.persisted) setIsSubmitting(false);
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const covers = clampCovers(draft.covers, seatsLeft);
  const values: OrderInput = {
    ...draft,
    covers,
    vg: clampVg(draft.vg, covers),
  };
  const order: OrderInput = {
    ...values,
    fullName: values.fullName.trim(),
    email: values.email.trim(),
  };
  const allErrors = validateOrder(order, seatsLeft);
  const errors = pickVisibleErrors(allErrors, touched, hasSubmitted);

  const touch = (field: Field): void =>
    setTouched((current) => ({ ...current, [field]: true }));

  const setFullName = (fullName: string): void =>
    setDraft((current) => ({ ...current, fullName }));

  const setEmail = (email: string): void =>
    setDraft((current) => ({ ...current, email }));

  const setCovers = (value: number): void => {
    const nextCovers = clampCovers(value, seatsLeft);
    setDraft((current) => ({
      ...current,
      covers: nextCovers,
      vg: clampVg(current.vg, nextCovers),
    }));
    touch("covers");
  };

  const setVg = (value: number): void =>
    setDraft((current) => ({ ...current, vg: clampVg(value, covers) }));

  const setAcceptTerms = (acceptTerms: boolean): void => {
    setDraft((current) => ({ ...current, acceptTerms }));
    touch("terms");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (isSubmitting) return;
    setHasSubmitted(true);

    const firstInvalid = (Object.keys(allErrors) as Field[])[0];
    if (firstInvalid) {
      const element = event.currentTarget.elements.namedItem(
        FIELD_INPUT_NAMES[firstInvalid],
      );
      if (element instanceof HTMLElement) element.focus();
      return;
    }

    setIsSubmitting(true);
    setSubmitError(undefined);
    const result = await createCheckout(order).catch(
      () => ({ ok: false, error: "PAYMENT_UNAVAILABLE" }) as const,
    );
    if (result.ok) {
      window.location.assign(result.url);
      return;
    }

    if (result.error === "SOLD_OUT") onSoldOut();
    setSubmitError(checkoutErrorMessage(result.error));
    setIsSubmitting(false);
  };

  return {
    values,
    errors,
    submitError,
    isSubmitting,
    maxCovers: Math.min(EVENT.maxPerEmail, seatsLeft),
    totalCents: orderTotalCents(covers),
    touch,
    setFullName,
    setEmail,
    setCovers,
    setVg,
    setAcceptTerms,
    handleSubmit,
  };
};

export const pickVisibleErrors = (
  errors: OrderErrors,
  touched: Partial<Record<Field, boolean>>,
  hasSubmitted: boolean,
): OrderErrors => {
  if (hasSubmitted) return errors;
  return Object.fromEntries(
    Object.entries(errors).filter(([field]) => touched[field as Field]),
  );
};

// INVALID only happens when the client checks drifted from the server's.
export const checkoutErrorMessage = (error: CheckoutError): string => {
  if (error === "SOLD_OUT") return ORDER_COPY.soldOut;
  if (error === "MAX_PER_EMAIL") return ORDER_COPY.maxPerPerson;
  return ORDER_COPY.paymentUnavailable;
};

const INITIAL_ORDER: OrderInput = {
  fullName: "",
  email: "",
  covers: 1,
  vg: 0,
  acceptTerms: false,
};

const FIELD_INPUT_NAMES: Record<Field, string> = {
  fullName: "fullName",
  email: "email",
  covers: "covers",
  terms: "acceptTerms",
};
