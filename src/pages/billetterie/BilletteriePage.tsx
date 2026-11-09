import { MotionConfig } from "motion/react";
import { EVENT } from "../../event";
import { Addition } from "./Addition";
import { Hero } from "./Hero";
import { OrderSlip } from "./OrderSlip";
import { SeatCounter } from "./SeatCounter";
import { SoldOut } from "./SoldOut";
import { useOrderForm } from "./useOrderForm";
import { useSeatsLeft } from "./useSeatsLeft";

export function BilletteriePage() {
  const { view, counter, seatsLeft, refresh } = useSeatsLeft();
  const form = useOrderForm(seatsLeft, refresh);
  const isSoldOut = view === "soldOut";

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto flex min-h-svh w-full max-w-[480px] flex-col lg:max-w-none">
        <Hero />
        <main
          className={`bg-fond-inox flex flex-col pt-10 lg:min-h-0 lg:pt-24 lg:pb-32 ${isSoldOut ? "" : "min-h-[936px]"}`}
        >
          {counter && isSoldOut && (
            <div className={DESKTOP_CONTAINER}>
              <div className="px-7">
                <SeatCounter left={counter.left} capacity={counter.capacity} />
              </div>
              <SoldOut />
            </div>
          )}
          {view === "form" && (
            <form
              noValidate
              onSubmit={form.handleSubmit}
              className={`flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-x-20 ${DESKTOP_CONTAINER}`}
            >
              {counter && (
                <div className="px-7 lg:col-span-2 lg:row-start-1 lg:px-0">
                  <SeatCounter
                    left={counter.left}
                    capacity={counter.capacity}
                  />
                </div>
              )}
              <div className="px-7 pb-16 lg:col-start-1 lg:row-start-2 lg:px-0 lg:pb-0">
                <OrderSlip
                  values={form.values}
                  errors={form.errors}
                  maxCovers={form.maxCovers}
                  seatsLeft={seatsLeft}
                  totalCents={form.totalCents}
                  onFullNameChange={form.setFullName}
                  onEmailChange={form.setEmail}
                  onAllergiesChange={form.setAllergies}
                  onCoversChange={form.setCovers}
                  onVgChange={form.setVg}
                  onBlur={form.touch}
                />
              </div>
              <div className="mt-auto lg:sticky lg:top-8 lg:col-start-2 lg:row-start-2 lg:mt-0">
                <Addition
                  totalCents={form.totalCents}
                  acceptTerms={form.values.acceptTerms}
                  termsError={form.errors.terms}
                  submitError={form.submitError}
                  isSubmitting={form.isSubmitting}
                  onAcceptTermsChange={form.setAcceptTerms}
                />
              </div>
            </form>
          )}
        </main>
        <footer className="lg:relative lg:-mt-px lg:bg-ground">
          <div
            className={`flex flex-col items-center gap-6 px-6 pt-12 pb-10 text-center lg:gap-8 lg:pt-16 lg:pb-16 ${DESKTOP_CONTAINER}`}
          >
            <p className="text-[13px] font-black text-label uppercase lg:text-sm">
              Et dès {EVENT.afterTime}, after-déjeuner gratuit et ouvert à
              toustes.
            </p>
            <img
              src="/img/snack-snack-logo-sm.png"
              alt="Snack Snack"
              width={818}
              height={444}
              loading="lazy"
              className="block h-auto w-[120px] lg:w-[160px]"
            />
            <p className="text-xs leading-relaxed font-bold text-steel-400 lg:text-sm">
              Tes données servent uniquement à organiser ce déjeuner et seront
              supprimées après. Contact :{" "}
              <a
                href={`mailto:${EVENT.contactEmail}`}
                className="text-mustard underline underline-offset-[3px] hover:text-mustard-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mustard"
              >
                {EVENT.contactEmail}
              </a>
            </p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}

const DESKTOP_CONTAINER = "lg:mx-auto lg:w-full lg:max-w-[1100px] lg:px-12";
