import { Hono } from "hono";
import type {
  AdminAdded,
  AdminData,
  AdminRow,
  AdminTotals,
  EmailOutcome,
} from "../src/lib/admin-api";
import type { ReservationView } from "../src/lib/api";
import { EVENT } from "../src/event";
import { firstName } from "../src/lib/format";
import { SeatError, type Db, type Reservation } from "./db";
import { renderConfirmationEmail, renderRefundAlert } from "./email-template";
import type { Mail, Mailer } from "./mailer";
import type { SumUp } from "./sumup";
import {
  parseAdminReservationBody,
  parseCancelBody,
  parseCapacityBody,
  parseCheckoutBody,
} from "./validation";

export type Deps = {
  db: Db;
  sumup: SumUp;
  // null when SMTP is not configured: nothing is claimed or sent.
  mailer: Mailer | null;
  verifyAdmin: (
    authHeader: string | undefined,
  ) => Promise<{ email: string } | null>;
  env: { siteUrl: string; priceCents: number };
};

export const createApp = (deps: Deps): Hono => {
  const app = new Hono();

  app.get("/api/seats-left", async (c) =>
    c.json(await deps.db.seatsLeft(), 200, {
      "Cache-Control": "public, max-age=10",
    }),
  );

  app.post("/api/checkout", async (c) => {
    const parsed = parseCheckoutBody(await c.req.json().catch(() => null));
    if (!parsed.ok) return c.json({ error: "INVALID" }, 400);
    const { fullName, email, covers, vg } = parsed.value;
    const { siteUrl, priceCents } = deps.env;

    let id: string;
    try {
      id = await deps.db.holdSeats({ fullName, email, covers, vg, priceCents });
    } catch (error) {
      if (
        error instanceof SeatError &&
        (error.code === "SOLD_OUT" || error.code === "MAX_PER_EMAIL")
      )
        return c.json({ error: error.code }, 409);
      throw error;
    }

    try {
      const checkout = await deps.sumup.createCheckout({
        amountCents: covers * priceCents,
        reference: id,
        description: `Snack Snack #${EVENT.edition} — ${covers} couvert${covers > 1 ? "s" : ""}`,
        redirectUrl: `${siteUrl}/merci?ref=${id}`,
        returnUrl: `${siteUrl}/api/webhook/sumup`,
      });
      await deps.db.attachCheckout(id, checkout.id);
      return c.json({ url: checkout.hostedCheckoutUrl });
    } catch (error) {
      console.error("SumUp checkout failed", error);
      await deps.db.markFailed(id, "failed");
      return c.json({ error: "PAYMENT_UNAVAILABLE" }, 502);
    }
  });

  app.get("/api/reservation", async (c) => {
    const ref = c.req.query("ref") ?? "";
    if (!UUID_PATTERN.test(ref)) return c.json({ error: "NOT_FOUND" }, 404);
    const reservation = await deps.db.getReservation(ref);
    if (!reservation) return c.json({ error: "NOT_FOUND" }, 404);

    // The stored status is still a valid answer while SumUp is unreachable;
    // /merci keeps polling.
    const current = await syncReservation(deps, reservation).catch(
      (error: unknown) => {
        console.error("Reservation sync failed", error);
        return reservation;
      },
    );
    return c.json(toReservationView(current));
  });

  // The payload is not signed: syncReservation re-reads SumUp. A sync error
  // answers 5xx so SumUp retries the delivery.
  app.post("/api/webhook/sumup", async (c) => {
    const body: unknown = await c.req.json().catch(() => undefined);
    if (body === undefined) return c.body(null, 400);
    if (
      typeof body !== "object" ||
      body === null ||
      !("event_type" in body) ||
      body.event_type !== "CHECKOUT_STATUS_CHANGED" ||
      !("id" in body) ||
      typeof body.id !== "string"
    )
      return c.body(null, 200);

    const reservation = await deps.db.getByCheckoutId(body.id);
    if (reservation) await syncReservation(deps, reservation);
    return c.body(null, 200);
  });

  app.route("/api/admin", createAdminRoutes(deps));

  return app;
};

// Every admin route re-checks the Supabase session and the whitelist.
const createAdminRoutes = (deps: Deps): Hono => {
  const admin = new Hono();

  admin.use(async (c, next) => {
    c.header("Cache-Control", "no-store");
    if (!(await deps.verifyAdmin(c.req.header("Authorization"))))
      return c.json({ error: "UNAUTHORIZED" }, 401);
    await next();
  });

  admin.get("/reservations", async (c) => {
    await reconcilePayments(deps);
    const [rows, { capacity }] = await Promise.all([
      deps.db.listReservations(),
      deps.db.seatsLeft(),
    ]);
    const data: AdminData = {
      totals: { ...paidTotals(rows), capacity },
      rows: rows.map(toAdminRow),
      emailEnabled: deps.mailer !== null,
    };
    return c.json(data);
  });

  admin.post("/capacity", async (c) => {
    const parsed = parseCapacityBody(await c.req.json().catch(() => null));
    if (!parsed.ok) return c.json({ error: "INVALID" }, 400);
    try {
      await deps.db.setCapacity(parsed.value);
    } catch (error) {
      if (error instanceof SeatError && error.code === "CAPACITY_BELOW_TAKEN")
        return c.json({ error: error.code }, 409);
      throw error;
    }
    return c.json({ capacity: parsed.value });
  });

  admin.post("/reservations", async (c) => {
    const parsed = parseAdminReservationBody(
      await c.req.json().catch(() => null),
    );
    if (!parsed.ok) return c.json({ error: "INVALID" }, 400);
    const { sendEmail, ...input } = parsed.value;

    let added: { id: string; ticket_no: number };
    try {
      added = await deps.db.adminAdd({
        ...input,
        priceCents: deps.env.priceCents,
      });
    } catch (error) {
      if (error instanceof SeatError && error.code === "SOLD_OUT")
        return c.json({ error: error.code }, 409);
      throw error;
    }

    // syncReservation never emails manual rows: the admin asks for it here.
    const email: EmailOutcome =
      sendEmail && input.email !== null && deps.mailer
        ? await sendManualConfirmation(deps, deps.mailer, added.id)
        : "none";
    const body: AdminAdded = { id: added.id, ticketNo: added.ticket_no, email };
    return c.json(body);
  });

  admin.post("/reservations/:id/cancel", async (c) => {
    const id = c.req.param("id");
    const parsed = parseCancelBody(await c.req.json().catch(() => null));
    if (!parsed.ok) return c.json({ error: "INVALID" }, 400);
    // admin_cancel does nothing on an unknown id: check it exists first.
    if (!UUID_PATTERN.test(id) || !(await deps.db.getReservation(id)))
      return c.json({ error: "NOT_FOUND" }, 404);
    if (!(await deps.db.adminCancel(id, parsed.value)))
      return c.json({ error: "CHANGED" }, 409);
    return c.json({ id });
  });

  return admin;
};

// The admin list is the safety net for a webhook that never came: a customer
// who paid and closed the tab is confirmed (or flagged for refund) here. Only
// the payment is synced: one email send can take most of Netlify's ~10 s, so
// owed emails are left to the next poll or webhook. Older rows are skipped so
// abandoned holds do not add SumUp calls to every load forever.
const reconcilePayments = async (deps: Deps): Promise<void> => {
  const rows = await deps.db.listReservations();
  const since = Date.now() - RECONCILE_WINDOW_MS;
  const results = await Promise.allSettled(
    rows
      .filter(
        (row) =>
          row.sumup_checkout_id !== null &&
          isAwaitingPayment(row) &&
          row.created_at.getTime() >= since,
      )
      .map((row) => syncPayment(deps, row)),
  );
  for (const result of results)
    if (result.status === "rejected")
      console.error("Admin payment sync failed", result.reason);
};

const sendManualConfirmation = async (
  deps: Deps,
  mailer: Mailer,
  id: string,
): Promise<EmailOutcome> => {
  const reservation = await deps.db.getReservation(id);
  const mail = reservation && confirmationEmail(deps, reservation);
  if (!mail) return "failed";
  return (await sendClaimedEmail(deps, mailer, id, mail)) === "sent"
    ? "sent"
    : "failed";
};

// Rows to refund hold no seat and their money is going back: leave them out.
const paidTotals = (
  rows: Reservation[],
): Omit<AdminTotals, "capacity"> => {
  const paid = rows.filter((row) => row.status === "paid" && !row.needs_refund);
  return {
    coversPaid: sum(paid, (row) => row.covers),
    vgCovers: sum(paid, (row) => row.vg),
    amountCents: sum(paid, (row) => row.amount_cents),
    reservations: paid.length,
  };
};

const sum = (
  rows: Reservation[],
  pick: (row: Reservation) => number,
): number => rows.reduce((total, row) => total + pick(row), 0);

const toAdminRow = (row: Reservation): AdminRow => ({
  id: row.id,
  ticketNo: row.ticket_no,
  fullName: row.full_name,
  email: row.email,
  covers: row.covers,
  vg: row.vg,
  status: row.status,
  source: row.source,
  paymentMethod: row.payment_method,
  needsRefund: row.needs_refund,
  paidAt: row.paid_at?.toISOString() ?? null,
  createdAt: row.created_at.toISOString(),
});

// Brings a reservation in line with its SumUp checkout, then sends its email
// if that is still owed. Unpaid rows are re-read even after a decline, expiry
// or an admin cancel: a FAILED checkout can still be paid on the same hosted
// page, and a late payment must still be confirmed (or flagged for refund) by
// confirm_payment.
export const syncReservation = async (
  deps: Deps,
  reservation: Reservation,
): Promise<Reservation> => {
  const current = await syncPayment(deps, reservation);
  await sendOwedEmail(deps, current);
  return current;
};

const syncPayment = async (
  deps: Deps,
  reservation: Reservation,
): Promise<Reservation> => {
  const checkoutId = reservation.sumup_checkout_id;
  if (!checkoutId || !isAwaitingPayment(reservation)) return reservation;

  const { status } = await deps.sumup.getCheckout(checkoutId);
  if (status === "PAID") {
    await deps.db.confirmPayment(reservation.id);
    return reread(deps, reservation);
  }
  if (
    (status === "FAILED" || status === "EXPIRED") &&
    reservation.status === "held"
  ) {
    await deps.db.markFailed(
      reservation.id,
      status === "FAILED" ? "failed" : "expired",
    );
    return reread(deps, reservation);
  }
  return reservation;
};

// The claim stamps email_sent_at before sending, so concurrent syncs send at
// most once; a failed send releases it and the next poll or webhook retries.
// A refund alert to the organisers takes the place of the confirmation.
const sendOwedEmail = async (
  deps: Deps,
  reservation: Reservation,
): Promise<void> => {
  if (!deps.mailer) return;
  const mail = owedEmail(deps, reservation);
  if (mail) await sendClaimedEmail(deps, deps.mailer, reservation.id, mail);
};

const sendClaimedEmail = async (
  deps: Deps,
  mailer: Mailer,
  id: string,
  mail: Mail,
): Promise<"sent" | "failed" | "claimed"> => {
  if (!(await deps.db.claimEmail(id))) return "claimed";

  try {
    await mailer.send(mail);
    return "sent";
  } catch (error) {
    console.error(`Email for reservation ${id} failed: ${errorCode(error)}`);
    await deps.db.releaseEmail(id);
    return "failed";
  }
};

const owedEmail = (deps: Deps, reservation: Reservation): Mail | null => {
  if (reservation.email_sent_at !== null || reservation.source !== "online")
    return null;
  if (reservation.needs_refund && reservation.paid_at !== null)
    return {
      ...renderRefundAlert(reservation),
      to: EVENT.contactEmail,
      replyTo: EVENT.contactEmail,
    };
  return confirmationEmail(deps, reservation);
};

const confirmationEmail = (
  deps: Deps,
  reservation: Reservation,
): Mail | null => {
  if (
    reservation.status !== "paid" ||
    reservation.ticket_no === null ||
    reservation.email === null
  )
    return null;

  const { siteUrl } = deps.env;
  return {
    ...renderConfirmationEmail({
      firstName: firstName(reservation.full_name),
      ticketNo: reservation.ticket_no,
      covers: reservation.covers,
      vg: reservation.vg,
      amountCents: reservation.amount_cents,
      ticketUrl: `${siteUrl}/billet?ref=${reservation.id}`,
      siteUrl,
    }),
    to: reservation.email,
    replyTo: EVENT.contactEmail,
  };
};

// Mail errors can quote the recipient: log only their code.
const errorCode = (error: unknown): string =>
  typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "UNKNOWN";

const isAwaitingPayment = (reservation: Reservation): boolean =>
  reservation.status === "held" ||
  reservation.status === "failed" ||
  reservation.status === "expired" ||
  (reservation.status === "cancelled" && reservation.paid_at === null);

const reread = async (
  deps: Deps,
  reservation: Reservation,
): Promise<Reservation> =>
  (await deps.db.getReservation(reservation.id)) ?? reservation;

const toReservationView = (reservation: Reservation): ReservationView => ({
  status: reservation.status,
  ticketNo: reservation.ticket_no,
  fullName: reservation.full_name,
  covers: reservation.covers,
  vg: reservation.vg,
  needsRefund: reservation.needs_refund,
  hasCheckout: reservation.sumup_checkout_id !== null,
});

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A payment more than 48 h after its checkout was created is not plausible.
const RECONCILE_WINDOW_MS = 48 * 60 * 60 * 1000;
