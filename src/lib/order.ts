import { EVENT } from "../event";

export type OrderInput = {
  fullName: string;
  email: string;
  allergies: string;
  covers: number;
  vg: number;
  acceptTerms: boolean;
};

export type OrderErrors = Partial<
  Record<
    "fullName" | "email" | "allergies" | "covers" | "terms",
    string
  >
>;

export const ORDER_COPY = {
  fullName: "Il manque ton prénom et ton nom.",
  email: "Il manque la fin de l'adresse. Ton billet arrive par là.",
  allergies: "200 caractères max. pour les allergies.",
  terms: "Coche la case pour continuer.",
  maxPerPerson: `${EVENT.maxPerEmail} couverts max. par personne.`,
  seatsLeft: (n: number): string =>
    `Il ne reste que ${n} place${n > 1 ? "s" : ""}.`,
  soldOut: "C'est complet, désolé.",
  paymentUnavailable: "Le paiement ne répond pas. Réessaie dans une minute.",
} as const;

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const FULL_NAME_MIN_LENGTH = 2;
const FULL_NAME_MAX_LENGTH = 120;
const ALLERGIES_MAX_LENGTH = 200;

// Counts code points, like Postgres char_length: an emoji is one, not two.
export const isValidFullName = (fullName: string): boolean => {
  const length = [...fullName.trim()].length;
  return length >= FULL_NAME_MIN_LENGTH && length <= FULL_NAME_MAX_LENGTH;
};

// Optional: an empty string means nothing was declared.
export const isValidAllergies = (allergies: string): boolean =>
  [...allergies.trim()].length <= ALLERGIES_MAX_LENGTH;

export const validateOrder = (
  input: OrderInput,
  seatsLeft: number,
): OrderErrors => {
  const errors: OrderErrors = {};

  if (!isValidFullName(input.fullName)) errors.fullName = ORDER_COPY.fullName;
  if (!EMAIL_PATTERN.test(input.email)) errors.email = ORDER_COPY.email;
  if (!isValidAllergies(input.allergies))
    errors.allergies = ORDER_COPY.allergies;
  if (input.covers > EVENT.maxPerEmail) errors.covers = ORDER_COPY.maxPerPerson;
  else if (input.covers > seatsLeft)
    errors.covers = ORDER_COPY.seatsLeft(seatsLeft);
  if (!input.acceptTerms) errors.terms = ORDER_COPY.terms;

  return errors;
};

export const orderTotalCents = (covers: number): number =>
  covers * EVENT.priceCents;

export const clampCovers = (n: number, seatsLeft: number): number =>
  Math.max(1, Math.min(n, EVENT.maxPerEmail, seatsLeft));

export const clampVg = (vg: number, covers: number): number =>
  Math.max(0, Math.min(vg, covers));
