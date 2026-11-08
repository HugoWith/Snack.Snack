import { EMAIL_PATTERN, isValidFullName } from "./order";

export type ManualPaymentMethod = "liquide" | "tpe" | "offert";

export type AdminOrderInput = {
  fullName: string;
  email: string;
  covers: number;
  vg: number;
  paymentMethod: ManualPaymentMethod | null;
  sendEmail: boolean;
};

export type AdminOrderErrors = Partial<
  Record<"fullName" | "email" | "covers" | "vg" | "paymentMethod", string>
>;

export const MANUAL_PAYMENT_METHODS: readonly ManualPaymentMethod[] = [
  "liquide",
  "tpe",
  "offert",
];

export const ADMIN_ORDER_COPY = {
  fullName: "Il manque le prénom et le nom.",
  email: "Cette adresse n'a pas l'air complète.",
  covers: "Mets un nombre entier, 1 ou plus.",
  vg: "Entre 0 et le nombre de couverts.",
  paymentMethod: "Choisis le moyen de paiement.",
} as const;

export const validateAdminOrder = (
  input: AdminOrderInput,
): AdminOrderErrors => {
  const errors: AdminOrderErrors = {};
  const email = input.email.trim();

  if (!isValidFullName(input.fullName))
    errors.fullName = ADMIN_ORDER_COPY.fullName;
  if (email !== "" && !EMAIL_PATTERN.test(email))
    errors.email = ADMIN_ORDER_COPY.email;
  // A manual row has no covers cap: only the seats left bound it, server side.
  if (!Number.isInteger(input.covers) || input.covers < 1)
    errors.covers = ADMIN_ORDER_COPY.covers;
  else if (
    !Number.isInteger(input.vg) ||
    input.vg < 0 ||
    input.vg > input.covers
  )
    errors.vg = ADMIN_ORDER_COPY.vg;
  if (input.paymentMethod === null)
    errors.paymentMethod = ADMIN_ORDER_COPY.paymentMethod;

  return errors;
};
