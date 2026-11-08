import { useRef, useState } from "react";
import { exportTicketPng } from "../lib/export-ticket";
import { ticketFileName } from "../lib/format";

export const useSaveTicket = (ticketNo: number) => {
  const posterRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "failed">("idle");

  const handleSave = async (): Promise<void> => {
    if (!posterRef.current || status === "saving") return;
    setStatus("saving");
    try {
      await exportTicketPng(posterRef.current, ticketFileName(ticketNo));
      setStatus("idle");
    } catch (error) {
      console.error("Ticket export failed", error);
      setStatus("failed");
    }
  };

  return {
    posterRef,
    isSaving: status === "saving",
    hasFailed: status === "failed",
    handleSave,
  };
};
