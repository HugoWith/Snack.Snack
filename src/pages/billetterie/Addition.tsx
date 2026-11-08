import { EVENT } from "../../event";
import { formatEuros } from "../../lib/format";
import { FieldError } from "./FieldError";
import { PayButton } from "./PayButton";
import { TickingAmount } from "./TickingAmount";

interface AdditionProps {
  totalCents: number;
  acceptTerms: boolean;
  termsError?: string;
  submitError?: string;
  isSubmitting: boolean;
  onAcceptTermsChange: (value: boolean) => void;
}

export function Addition({
  totalCents,
  acceptTerms,
  termsError,
  submitError,
  isSubmitting,
  onAcceptTermsChange,
}: AdditionProps) {
  return (
    <section
      aria-label="L'addition"
      className="flex flex-col gap-6 bg-mustard px-6 pt-8 pb-9 text-ink lg:gap-7 lg:px-8 lg:pt-10 lg:pb-8"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-[26px] tracking-[-0.035em] uppercase lg:text-[32px]">
          L'addition.
        </h2>
        <TickingAmount
          value={formatEuros(totalCents)}
          className="font-display text-5xl leading-[0.85] tracking-[-0.06em] lg:text-7xl"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex min-h-11 cursor-pointer items-center">
          <span className="flex items-start gap-3">
            <input
              type="checkbox"
              name="acceptTerms"
              checked={acceptTerms}
              aria-invalid={Boolean(termsError)}
              aria-describedby="terms-error"
              onChange={(event) => onAcceptTermsChange(event.target.checked)}
              className="mt-px size-5 flex-none cursor-pointer appearance-none border-2 border-ink bg-transparent checked:bg-ink checked:shadow-[inset_0_0_0_3px_var(--mustard)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            />
            <span className="text-sm leading-[1.4] font-medium">
              C'est noté : {EVENT.terms.charAt(0).toLowerCase()}
              {EVENT.terms.slice(1)}
            </span>
          </span>
        </label>
        <FieldError
          id="terms-error"
          message={termsError}
          tone="ink"
          className="pl-8"
        />
      </div>
      <div className="flex flex-col gap-3">
        <PayButton isSubmitting={isSubmitting} />
        <div role="alert">
          <FieldError id="submit-error" message={submitError} tone="ink" />
        </div>
        <p className="text-center text-xs font-bold">
          Paiement sécurisé par SumUp
        </p>
      </div>
    </section>
  );
}
