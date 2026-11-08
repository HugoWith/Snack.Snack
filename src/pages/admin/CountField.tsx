import { FieldError } from "../billetterie/FieldError";
import { INPUT_CLASSES, LABEL_CLASSES } from "./admin-classes";

interface CountFieldProps {
  label: string;
  name: string;
  value: number;
  min: number;
  max?: number;
  error?: string;
  onChange: (value: number) => void;
}

// An emptied field holds NaN until the organiser types a number again.
export function CountField({
  label,
  name,
  value,
  min,
  max,
  error,
  onChange,
}: CountFieldProps) {
  const errorId = `add-${name}-error`;

  return (
    <label className="flex w-32 flex-col gap-2">
      <span className={LABEL_CLASSES}>{label}</span>
      <input
        name={name}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={Number.isNaN(value) ? "" : value}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        className={`${INPUT_CLASSES} font-display text-2xl tracking-[-0.04em] tabular-nums`}
      />
      <FieldError id={errorId} message={error} />
    </label>
  );
}
