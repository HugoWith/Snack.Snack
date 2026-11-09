import { ReceiptFooter } from "../../components/receipt/ReceiptFooter";
import { RECEIPT_LABEL_CLASSES } from "../../components/receipt/receipt-classes";
import { ReceiptHeader } from "../../components/receipt/ReceiptHeader";
import { EVENT } from "../../event";
import { formatTableLine, streetOf } from "../../lib/format";
import {
  ALLERGIES_MAX_LENGTH,
  ORDER_COPY,
  type OrderErrors,
  type OrderInput,
} from "../../lib/order";
import { FieldError } from "./FieldError";
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
  onAllergiesChange: (value: string) => void;
  onCoversChange: (value: number) => void;
  onVgChange: (value: number) => void;
  onBlur: (field: "fullName" | "email" | "allergies") => void;
}

export function OrderSlip({
  values,
  errors,
  maxCovers,
  seatsLeft,
  totalCents,
  onFullNameChange,
  onEmailChange,
  onAllergiesChange,
  onCoversChange,
  onVgChange,
  onBlur,
}: OrderSlipProps) {
  const isLimitedBySeats = seatsLeft < EVENT.maxPerEmail;

  return (
    <div className="-rotate-1 drop-shadow-paper">
      <div className="receipt-edges flex flex-col gap-7 bg-paper px-6 pt-10 pb-9 text-ticket-ink lg:px-10 lg:pt-12 lg:pb-11">
        <ReceiptHeader>
          <p className={RECEIPT_LABEL_CLASSES}>
            {EVENT.venue.name} · {streetOf(EVENT.venue.address)}
          </p>
          <p className={`${RECEIPT_LABEL_CLASSES} tabular-nums`}>
            {formatTableLine(EVENT.tableNo, EVENT.dateISO)}
          </p>
        </ReceiptHeader>
        <label className="flex flex-col gap-1">
          <span className={RECEIPT_LABEL_CLASSES}>Prénom et nom:</span>
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
          <span className={RECEIPT_LABEL_CLASSES}>Email:</span>
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
        <label className="flex flex-col gap-1">
          <span className={RECEIPT_LABEL_CLASSES}>
            Allergies / intolérances (facultatif):
          </span>
          <input
            name="allergies"
            autoComplete="off"
            maxLength={ALLERGIES_MAX_LENGTH}
            placeholder="Précise ici ce que tu ne manges pas"
            value={values.allergies}
            aria-invalid={Boolean(errors.allergies)}
            aria-describedby="allergies-error"
            onChange={(event) => onAllergiesChange(event.target.value)}
            onBlur={() => onBlur("allergies")}
            className={`${INPUT_CLASSES} py-2 font-text text-lg font-bold`}
          />
          <FieldError id="allergies-error" message={errors.allergies} />
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

const INPUT_CLASSES =
  "min-h-11 w-full border-0 border-b-[1.5px] leading-[normal] border-ticket-ink bg-transparent text-ticket-value caret-ticket-value outline-none placeholder:font-medium placeholder:text-paper-shade focus:border-ticket-value focus:shadow-[0_1.5px_0_0_var(--ticket-value)] aria-invalid:border-alert aria-invalid:focus:shadow-[0_1.5px_0_0_var(--alert)] autofill:shadow-[inset_0_0_0_100px_var(--paper)] autofill:[-webkit-text-fill-color:var(--ticket-value)]";
