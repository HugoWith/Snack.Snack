import { LABEL_CLASSES } from "./admin-classes";

interface ChoiceGroupProps<T extends string | number> {
  legend: string;
  name: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  describedBy?: string;
  isInvalid?: boolean;
  onChange: (value: T) => void;
}

export function ChoiceGroup<T extends string | number>({
  legend,
  name,
  options,
  value,
  describedBy,
  isInvalid = false,
  onChange,
}: ChoiceGroupProps<T>) {
  return (
    <fieldset aria-describedby={describedBy} className="flex flex-col gap-2">
      <legend className={`${LABEL_CLASSES} mb-2`}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center border px-4 text-sm font-black text-label uppercase transition-colors duration-150 hover:border-text hover:text-text has-checked:border-mustard has-checked:bg-mustard has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-mustard ${isInvalid ? "border-alert" : "border-steel-600"}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
