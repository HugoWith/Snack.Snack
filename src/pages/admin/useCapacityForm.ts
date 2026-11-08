import { useState, type FormEvent } from "react";
import { saveCapacity } from "../../lib/admin-api";
import { ADMIN_ERROR_COPY } from "./admin-copy";

type Notice = { message: string; isAlert: boolean };

export const useCapacityForm = (
  token: string,
  capacity: number,
  onSaved: () => void,
) => {
  const [value, setValue] = useState(String(capacity));
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (isSaving) return;
    const next = Number(value);
    if (value.trim() === "" || !Number.isInteger(next) || next < 0) {
      setNotice({ message: CAPACITY_COPY.invalid, isAlert: true });
      return;
    }

    setIsSaving(true);
    const result = await saveCapacity(token, next);
    setIsSaving(false);
    if (!result.ok) {
      setNotice({ message: ADMIN_ERROR_COPY[result.error], isAlert: true });
      return;
    }
    setNotice({ message: CAPACITY_COPY.saved(next), isAlert: false });
    onSaved();
  };

  return { value, setValue, isSaving, notice, handleSubmit };
};

const CAPACITY_COPY = {
  invalid: "Mets un nombre entier, 0 ou plus.",
  saved: (n: number): string =>
    `C'est enregistré : ${n} place${n > 1 ? "s" : ""} en vente. Le compteur du site suit sous 10 secondes.`,
} as const;
