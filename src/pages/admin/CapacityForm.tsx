import {
  HEADING_CLASSES,
  INPUT_CLASSES,
  LABEL_CLASSES,
  NOTICE_CLASSES,
  PANEL_CLASSES,
  PRIMARY_BUTTON_CLASSES,
} from "./admin-classes";
import { useCapacityForm } from "./useCapacityForm";

interface CapacityFormProps {
  token: string;
  capacity: number;
  coversPaid: number;
  onSaved: () => void;
}

export function CapacityForm({
  token,
  capacity,
  coversPaid,
  onSaved,
}: CapacityFormProps) {
  const form = useCapacityForm(token, capacity, onSaved);

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit}
      aria-labelledby="capacity-title"
      className={PANEL_CLASSES}
    >
      <h2 id="capacity-title" className={HEADING_CLASSES}>
        Places en vente
      </h2>
      <label className="flex flex-col gap-2">
        <span className={LABEL_CLASSES}>Nombre total de places</span>
        <input
          name="capacity"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={form.value}
          aria-invalid={Boolean(form.notice?.isAlert)}
          aria-describedby="capacity-help capacity-notice"
          onChange={(event) => form.setValue(event.target.value)}
          className={`${INPUT_CLASSES} font-display text-2xl tracking-[-0.04em] tabular-nums`}
        />
        <span id="capacity-help" className="text-sm font-bold text-steel-400">
          {`Déjà ${coversPaid} couvert${coversPaid > 1 ? "s payés" : " payé"}. Impossible de descendre sous les places déjà prises.`}
        </span>
      </label>
      <button
        type="submit"
        disabled={form.isSaving}
        className={PRIMARY_BUTTON_CLASSES}
      >
        {form.isSaving ? "Enregistrement…" : "Enregistrer"}
      </button>
      <p
        id="capacity-notice"
        role="status"
        className={`${NOTICE_CLASSES} ${form.notice?.isAlert ? "text-alert" : "text-text"}`}
      >
        {form.notice?.message}
      </p>
    </form>
  );
}
