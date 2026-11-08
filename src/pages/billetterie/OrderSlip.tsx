import { EVENT } from "../../event";
import { ORDER_COPY, type OrderErrors, type OrderInput } from "../../lib/order";
import { FieldError } from "./FieldError";
import { ReceiptFooter } from "./ReceiptFooter";
import { ReceiptHeader } from "./ReceiptHeader";
import { ReceiptTotal } from "./ReceiptTotal";
import { Stepper } from "./Stepper";

interface OrderSlipProps {
  values: OrderInput;
  errors: OrderErrors;
  maxCovers: number;
  seatsLeft: number;
  totalCents: number;
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
  totalCents,
  onFullNameChange,
  onEmailChange,
  onCoversChange,
  onVgChange,
  onBlur,
}: OrderSlipProps) {
  const isLimitedBySeats = seatsLeft < EVENT.maxPerEmail;

  return (
    <div className="-rotate-1 drop-shadow-paper">
      <div className="receipt-edges flex flex-col gap-7 bg-paper px-6 pt-10 pb-9 text-ticket-ink lg:px-10 lg:pt-12 lg:pb-11">
        <ReceiptHeader />
        <label className="flex flex-col gap-1">
          <span className={LABEL_CLASSES}>Prénom et nom:</span>
          <input
            name="fullName"
            autoComplete="name"
            placeholder="Zinédine Zidandan"
            value={values.fullName}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby="fullName-error"
            onChange={(event) => onFullNameChange(event.target.value)}
            onBlur={() => onBlur("fullName")}
            className={`${INPUT_CLASSES} py-2 font-display text-[22px] tracking-[-0.03em] uppercase placeholder:font-text placeholder:text-lg placeholder:tracking-normal placeholder:normal-case`}
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
            placeholder="zinedine@exemple.fr"
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
          <div className="flex flex-col gap-1">
            <Stepper
              label="Couverts"
              value={values.covers}
              min={1}
              max={maxCovers}
              decrementLabel="Retirer un couvert"
              incrementLabel="Ajouter un couvert"
              describedBy="covers-error"
              onChange={onCoversChange}
            />
            <Stepper
              label="Dont végé"
              value={values.vg}
              min={0}
              max={values.covers}
              decrementLabel="Retirer un couvert végé"
              incrementLabel="Ajouter un couvert végé"
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
        <ReceiptTotal totalCents={totalCents} />
        <ReceiptFooter />
      </div>
    </div>
  );
}

const LABEL_CLASSES = "text-[11px] font-bold tracking-[0.06em] uppercase";

const INPUT_CLASSES =
  "min-h-11 w-full border-0 border-b-[1.5px] leading-[normal] border-ticket-ink bg-transparent text-ticket-value caret-ticket-value outline-none placeholder:font-medium placeholder:text-paper-shade focus:border-ticket-value focus:shadow-[0_1.5px_0_0_var(--ticket-value)] aria-invalid:border-alert aria-invalid:focus:shadow-[0_1.5px_0_0_var(--alert)] autofill:shadow-[inset_0_0_0_100px_var(--paper)] autofill:[-webkit-text-fill-color:var(--ticket-value)]";
