import type { ManualPaymentMethod } from "../../lib/admin-order";
import { PAYMENT_LABELS } from "../../lib/admin-format";
import { FieldError } from "../billetterie/FieldError";
import {
  HEADING_CLASSES,
  INPUT_CLASSES,
  LABEL_CLASSES,
  PANEL_CLASSES,
  PRIMARY_BUTTON_CLASSES,
} from "./admin-classes";
import { AddedNotice } from "./AddedNotice";
import { ChoiceGroup } from "./ChoiceGroup";
import { CountField } from "./CountField";
import { useAddReservationForm } from "./useAddReservationForm";

interface AddReservationFormProps {
  token: string;
  isEmailEnabled: boolean;
  onAdded: () => void;
}

export function AddReservationForm({
  token,
  isEmailEnabled,
  onAdded,
}: AddReservationFormProps) {
  const form = useAddReservationForm(token, onAdded);
  const { values, errors } = form;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit}
      aria-labelledby="add-title"
      className={PANEL_CLASSES}
    >
      <div className="flex flex-col gap-2">
        <h2 id="add-title" className={HEADING_CLASSES}>
          Ajouter une réservation
        </h2>
        <p className="text-sm font-bold text-steel-400">
          Payée en liquide, au TPE, ou offerte. Elle passe tout de suite en
          payée avec un Nº de billet.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={LABEL_CLASSES}>Prénom et nom</span>
          <input
            name="fullName"
            autoComplete="off"
            value={values.fullName}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby="add-fullName-error"
            onChange={(event) => form.update({ fullName: event.target.value })}
            className={INPUT_CLASSES}
          />
          <FieldError id="add-fullName-error" message={errors.fullName} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={LABEL_CLASSES}>Email (facultatif)</span>
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={values.email}
            aria-invalid={Boolean(errors.email)}
            aria-describedby="add-email-error"
            onChange={(event) => form.setEmail(event.target.value)}
            className={INPUT_CLASSES}
          />
          <FieldError id="add-email-error" message={errors.email} />
        </label>
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-5">
        <CountField
          label="Couverts"
          name="covers"
          value={values.covers}
          min={1}
          error={errors.covers}
          onChange={(covers) => form.update({ covers })}
        />
        <CountField
          label="Dont VG"
          name="vg"
          value={values.vg}
          min={0}
          max={Number.isInteger(values.covers) ? values.covers : undefined}
          error={errors.vg}
          onChange={(vg) => form.update({ vg })}
        />
        <div className="flex flex-col gap-2">
          <ChoiceGroup
            legend="Paiement"
            name="paymentMethod"
            options={PAYMENT_OPTIONS}
            value={values.paymentMethod}
            describedBy="add-payment-error"
            isInvalid={Boolean(errors.paymentMethod)}
            onChange={(paymentMethod) => form.update({ paymentMethod })}
          />
          <FieldError id="add-payment-error" message={errors.paymentMethod} />
        </div>
      </div>
      {isEmailEnabled && form.hasEmail && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 self-start">
          <input
            type="checkbox"
            name="sendEmail"
            checked={values.sendEmail}
            onChange={(event) =>
              form.update({ sendEmail: event.target.checked })
            }
            className="size-5 flex-none cursor-pointer appearance-none border-2 border-steel-400 bg-transparent checked:border-mustard checked:bg-mustard checked:shadow-[inset_0_0_0_3px_var(--steel-900)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mustard"
          />
          <span className="text-sm font-bold">
            Envoyer l'email de confirmation
          </span>
        </label>
      )}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
        <button
          type="submit"
          disabled={form.isSubmitting}
          className={`${PRIMARY_BUTTON_CLASSES} whitespace-nowrap lg:shrink-0`}
        >
          {form.isSubmitting ? "Ajout…" : "Ajouter la réservation"}
        </button>
        <AddedNotice notice={form.notice} />
      </div>
    </form>
  );
}

const PAYMENT_OPTIONS: { value: ManualPaymentMethod; label: string }[] = [
  { value: "liquide", label: PAYMENT_LABELS.liquide },
  { value: "tpe", label: PAYMENT_LABELS.tpe },
  { value: "offert", label: PAYMENT_LABELS.offert },
];
