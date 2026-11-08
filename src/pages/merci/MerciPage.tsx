import { LogoFooter } from "../../components/LogoFooter";
import {
  RESERVATION_COPY,
  ReservationMessage,
} from "../../components/ReservationMessage";
import { MerciPaid } from "./MerciPaid";
import { useMerciState } from "./useMerciState";

export function MerciPage() {
  const view = useMerciState();

  return (
    <div className="bg-fond-inox-merci flex min-h-svh flex-col">
      <main className="mx-auto flex w-full max-w-[480px] flex-col px-7 pt-10 lg:max-w-[1100px] lg:px-12 lg:pt-24">
        <p role="status" className="sr-only">
          {view.state === "show"
            ? PAID_ANNOUNCEMENT
            : RESERVATION_COPY[view.state]}
        </p>
        {view.state === "show" ? (
          <MerciPaid ticket={view.ticket} />
        ) : (
          <div className="pt-[136px] lg:pt-16">
            <ReservationMessage state={view.state} />
          </div>
        )}
      </main>
      <LogoFooter />
    </div>
  );
}

const PAID_ANNOUNCEMENT = "C'est réservé - on se voit à table";
