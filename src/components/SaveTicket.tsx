import type { TicketData } from "../lib/reservation-status";
import { CTA_CLASSES } from "./cta-classes";
import { TicketPoster } from "./TicketPoster";
import { useSaveTicket } from "./useSaveTicket";

interface SaveTicketProps {
  ticket: TicketData;
}

export function SaveTicket({ ticket }: SaveTicketProps) {
  const { posterRef, isSaving, hasFailed, handleSave } = useSaveTicket(
    ticket.ticketNo,
  );

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-3">
      <button
        type="button"
        disabled={isSaving}
        onClick={handleSave}
        className={CTA_CLASSES}
      >
        {isSaving ? "Enregistrement…" : "Enregistrer mon billet"}
      </button>
      <p
        role="alert"
        className="text-center text-sm leading-snug font-bold text-alert empty:hidden"
      >
        {hasFailed ? "Le billet ne s'enregistre pas. Réessaie." : ""}
      </p>
      {/* Fixed-size copy rendered off screen: the PNG is the same on every device. */}
      <div
        aria-hidden="true"
        inert
        className="pointer-events-none fixed top-0 left-[-10000px]"
      >
        <TicketPoster
          ref={posterRef}
          ticket={ticket}
          className="h-[720px] w-[405px]"
        />
      </div>
    </div>
  );
}
