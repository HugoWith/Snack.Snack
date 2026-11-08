import { useId } from "react";

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  decrementLabel: string;
  incrementLabel: string;
  describedBy?: string;
  onChange: (value: number) => void;
}

export function Stepper({
  label,
  value,
  min,
  max,
  decrementLabel,
  incrementLabel,
  describedBy,
  onChange,
}: StepperProps) {
  const labelId = useId();

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      className="flex flex-col gap-1.5"
    >
      <span
        id={labelId}
        className="text-[11px] font-bold tracking-[0.06em] uppercase"
      >
        {label}
      </span>
      <div className="flex items-center gap-[14px]">
        <StepButton
          label={decrementLabel}
          isDisabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </StepButton>
        <output
          aria-live="polite"
          className="min-w-[1ch] text-center font-display text-[30px] tracking-[-0.05em] text-ticket-value"
        >
          {value}
        </output>
        <StepButton
          label={incrementLabel}
          isDisabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </StepButton>
      </div>
    </div>
  );
}

interface StepButtonProps {
  label: string;
  isDisabled: boolean;
  onClick: () => void;
  children: string;
}

function StepButton({ label, isDisabled, onClick, children }: StepButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={isDisabled}
      onClick={onClick}
      className="size-11 cursor-pointer font-display text-2xl text-ticket-value transition-colors hover:bg-ticket-value/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ticket-value disabled:cursor-default disabled:bg-transparent disabled:text-paper-shade"
    >
      {children}
    </button>
  );
}
