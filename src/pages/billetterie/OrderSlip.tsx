import { EVENT } from "../../event";
import { ORDER_COPY, type OrderErrors, type OrderInput } from "../../lib/order";
import { FieldError } from "./FieldError";
import { Stepper } from "./Stepper";

interface OrderSlipProps {
  values: OrderInput;
  errors: OrderErrors;
  maxCovers: number;
  seatsLeft: number;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onCoversChange: (value: number) => void;
  onVgChange: (value: number) => void;
  onBlur: (field: "fullName" | "email") => void;
}

export function OrderSlip({
  values,
  errors,
  maxCovers,
  seatsLeft,
  onFullNameChange,
  onEmailChange,
  onCoversChange,
  onVgChange,
  onBlur,
}: OrderSlipProps) {
  const isLimitedBySeats = seatsLeft < EVENT.maxPerEmail;

  return (
    <div className="flex -rotate-1 flex-col gap-7 bg-paper px-6 pt-9 pb-8 text-ticket-ink shadow-paper lg:px-10 lg:pt-11 lg:pb-10">
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASSES}>Prénom et nom:</span>
        <input
          name="fullName"
          autoComplete="name"
          placeholder="Camille Durand"
          value={values.fullName}
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby="fullName-error"
          onChange={(event) => onFullNameChange(event.target.value)}
          onBlur={() => onBlur("fullName")}
          className={`${INPUT_CLASSES} py-2 font-display text-[22px] tracking-[-0.03em] uppercase`}
        />
        <FieldError id="fullName-error" message={errors.fullName} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASSES}>Email:</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="camille@exemple.fr"
          value={values.email}
          aria-invalid={Boolean(errors.email)}
          aria-describedby="email-error"
          onChange={(event) => onEmailChange(event.target.value)}
          onBlur={() => onBlur("email")}
          className={`${INPUT_CLASSES} py-2 font-text text-lg font-bold`}
        />
        <FieldError id="email-error" message={errors.email} />
      </label>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-4">
          <Stepper
            label="Covers:"
            value={values.covers}
            min={1}
            max={maxCovers}
            decrementLabel="Retirer un couvert"
            incrementLabel="Ajouter un couvert"
            describedBy="covers-error"
            onChange={onCoversChange}
          />
          <Stepper
            label="Dont VG:"
            value={values.vg}
            min={0}
            max={values.covers}
            decrementLabel="Retirer un couvert VG"
            incrementLabel="Ajouter un couvert VG"
            onChange={onVgChange}
          />
        </div>
        <FieldError
          id="covers-error"
          message={
            errors.covers ??
            (isLimitedBySeats ? ORDER_COPY.seatsLeft(seatsLeft) : undefined)
          }
          tone={errors.covers ? "alert" : "note"}
        />
      </div>
    </div>
  );
}

const LABEL_CLASSES = "text-[11px] font-bold tracking-[0.06em] uppercase";

const INPUT_CLASSES =
  "min-h-11 w-full border-0 border-b-[1.5px] leading-[normal] border-ticket-ink bg-transparent text-ticket-value caret-ticket-value outline-none placeholder:font-medium placeholder:text-paper-shade focus:border-ticket-value focus:shadow-[0_1.5px_0_0_var(--ticket-value)] aria-invalid:border-alert aria-invalid:focus:shadow-[0_1.5px_0_0_var(--alert)] autofill:shadow-[inset_0_0_0_100px_var(--paper)] autofill:[-webkit-text-fill-color:var(--ticket-value)]";
