import { EVENT } from "../../event";
import { LogoFooter } from "../../components/LogoFooter";
import { ReservationMessage } from "../../components/ReservationMessage";
import { SaveTicket } from "../../components/SaveTicket";
import { TicketPoster } from "../../components/TicketPoster";
import { useBilletState } from "./useBilletState";

export function BilletPage() {
  const view = useBilletState();

  if (!view) return <div className="bg-fond-inox-billet min-h-svh" />;

  if (view.state !== "show")
    return (
      <div className="bg-fond-inox-merci flex min-h-svh flex-col">
        <main className="mx-auto flex w-full max-w-[480px] flex-col px-7 pt-[176px] lg:max-w-[1100px] lg:px-12 lg:pt-40">
          <ReservationMessage state={view.state} />
        </main>
        <LogoFooter />
      </div>
    );

  return (
    <main>
      <h1 className="sr-only">Ton billet {EVENT.name}</h1>
      <TicketPoster ticket={view.ticket} className="min-h-svh lg:py-16">
        <SaveTicket ticket={view.ticket} />
      </TicketPoster>
    </main>
  );
}
