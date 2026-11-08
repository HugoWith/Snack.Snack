import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, syncReservation } from "../../server/app";
import type { Reservation } from "../../server/db";
import { renderConfirmationEmail } from "../../server/email-template";
import { EVENT } from "../../src/event";
import {
  RESERVATION_ID,
  SITE_URL,
  buildReservation,
  createDeps,
  createFakeDb,
  createFakeMailer,
  createFakeSumUp,
} from "./helpers";

const sendMail = vi.hoisted(() => vi.fn(async () => ({})));
const createTransport = vi.hoisted(() => vi.fn(() => ({ sendMail })));
vi.mock("nodemailer", () => ({ default: { createTransport } }));

const CONFIRMATION = {
  firstName: "Camille",
  ticketNo: 7,
  covers: 2,
  vg: 1,
  amountCents: 9000,
  ticketUrl: `${SITE_URL}/billet?ref=abc`,
  siteUrl: SITE_URL,
};

const PAID = buildReservation({
  status: "paid",
  ticket_no: 7,
  paid_at: new Date("2026-11-07T12:05:00Z"),
});

const setup = (
  row: Reservation,
  checkoutStatus: "PENDING" | "PAID" = "PAID",
) => {
  const db = createFakeDb([row]);
  const sumup = createFakeSumUp(checkoutStatus);
  const mailer = createFakeMailer();
  const deps = createDeps({ db, sumup, mailer });
  const sync = async () =>
    syncReservation(deps, (await db.getReservation(row.id)) as Reservation);
  return { db, sumup, mailer, deps, sync };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("renderConfirmationEmail", () => {
  it("puts the two-digit ticket number in the subject", () => {
    expect(renderConfirmationEmail(CONFIRMATION).subject).toBe(
      "Ton couvert est posé. Nº07",
    );
  });

  it("thanks the guest, links the ticket and signs off", () => {
    const { html, text } = renderConfirmationEmail(CONFIRMATION);

    for (const body of [html, text]) {
      expect(body).toContain("MERCI CAMILLE.");
      expect(body).toContain("/billet?ref=abc");
      expect(body).toContain("BISOU BISOU");
      expect(body).not.toContain("pièce jointe");
    }
  });

  it("states the event facts and the recap", () => {
    const { html } = renderConfirmationEmail(CONFIRMATION);

    expect(html).toContain("DIMANCHE 22 NOVEMBRE.");
    expect(html).toContain("12H00. SILK, MARSEILLE.");
    expect(html).toContain(EVENT.venue.address);
    expect(html).toContain("2 (1 VG)");
    expect(html).toContain("90€");
    expect(html).toContain(
      "Ton billet t'attend en un clic, garde-le sur ton téléphone.",
    );
    expect(html).toContain(
      "Une allergie, une remarque ? Réponds simplement à ce mail.",
    );
    expect(html).toContain(`L'after commence à ${EVENT.afterTime}`);
    expect(html).toContain("VOIR MON BILLET");
  });

  it("loads its images from the site", () => {
    const { html } = renderConfirmationEmail(CONFIRMATION);

    expect(html).toContain(`${SITE_URL}/img/plat-os.jpg`);
    expect(html).toContain(`${SITE_URL}/img/snack-snack-logo-sm.png`);
  });

  it("escapes the first name in the html", () => {
    const { html } = renderConfirmationEmail({
      ...CONFIRMATION,
      firstName: "<b>Zoé</b>",
    });

    expect(html).not.toContain("<B>");
    expect(html).toContain("MERCI &lt;B&gt;ZOÉ&lt;/B&gt;.");
  });
});

describe("createMailer", () => {
  it("sends through gmail from the configured address", async () => {
    const { createMailer } = await import("../../server/mailer");
    const mailer = createMailer({
      user: "snack@gmail.com",
      appPassword: "app-password",
      from: "Snack Snack <snack@gmail.com>",
    });

    await mailer.send({
      to: "camille@mail.fr",
      subject: "Sujet",
      html: "<p>Corps</p>",
      text: "Corps",
      replyTo: EVENT.contactEmail,
    });

    expect(createTransport).toHaveBeenCalledWith({
      service: "gmail",
      auth: { user: "snack@gmail.com", pass: "app-password" },
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 6000,
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: "Snack Snack <snack@gmail.com>",
      to: "camille@mail.fr",
      subject: "Sujet",
      html: "<p>Corps</p>",
      text: "Corps",
      replyTo: EVENT.contactEmail,
    });
  });
});

describe("confirmation email", () => {
  it("sends the confirmation when SumUp says PAID", async () => {
    const { mailer, sync } = setup(buildReservation());

    await sync();

    expect(mailer.send).toHaveBeenCalledTimes(1);
    expect(mailer.send).toHaveBeenCalledWith({
      to: "camille@mail.fr",
      replyTo: EVENT.contactEmail,
      subject: "Ton couvert est posé. Nº01",
      html: expect.stringContaining(`${SITE_URL}/billet?ref=${RESERVATION_ID}`),
      text: expect.stringContaining("MERCI CAMILLE."),
    });
  });

  it("sends the email once when a paid reservation is synced twice", async () => {
    const { db, sumup, mailer, sync } = setup(PAID);

    await sync();
    await sync();

    expect(mailer.send).toHaveBeenCalledTimes(1);
    expect(sumup.getCheckout).not.toHaveBeenCalled();
    expect(
      (await db.getReservation(RESERVATION_ID))?.email_sent_at,
    ).toBeInstanceOf(Date);
  });

  it("does not send again once the email is stamped", async () => {
    const { db, mailer, sync } = setup({ ...PAID, email_sent_at: new Date() });

    await sync();

    expect(mailer.send).not.toHaveBeenCalled();
    expect(db.claimEmail).not.toHaveBeenCalled();
  });

  it("keeps the request OK and releases the claim when the send fails", async () => {
    const db = createFakeDb([buildReservation()]);
    const mailer = createFakeMailer();
    mailer.send.mockRejectedValueOnce(
      Object.assign(new Error("Invalid login: camille@mail.fr"), {
        code: "EAUTH",
      }),
    );
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createApp(
      createDeps({ db, sumup: createFakeSumUp("PAID"), mailer }),
    );

    const res = await app.request(`/api/reservation?ref=${RESERVATION_ID}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "paid", ticketNo: 1 });
    expect((await db.getReservation(RESERVATION_ID))?.email_sent_at).toBe(null);
    expect(logged).toHaveBeenCalled();
    expect(JSON.stringify(logged.mock.calls)).not.toContain("camille@mail.fr");
  });

  it("retries a failed send on the next sync", async () => {
    const { db, mailer, sync } = setup(PAID);
    mailer.send.mockRejectedValueOnce(new Error("SMTP down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await sync();
    await sync();

    expect(mailer.send).toHaveBeenCalledTimes(2);
    expect(
      (await db.getReservation(RESERVATION_ID))?.email_sent_at,
    ).toBeInstanceOf(Date);
  });

  it("releases the claim when a stalled send times out", async () => {
    const { db, mailer, sync } = setup(PAID);
    mailer.send.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) =>
          setTimeout(
            () =>
              reject(
                Object.assign(new Error("Timeout"), { code: "ETIMEDOUT" }),
              ),
            20,
          ),
        ),
    );
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await sync();

    expect((await db.getReservation(RESERVATION_ID))?.email_sent_at).toBe(null);
    expect(String(logged.mock.calls[0][0])).toContain("ETIMEDOUT");

    await sync();

    expect(mailer.send).toHaveBeenCalledTimes(2);
  });

  it("does not email a reservation that is not paid yet", async () => {
    const { mailer, sync } = setup(buildReservation(), "PENDING");

    await sync();

    expect(mailer.send).not.toHaveBeenCalled();
  });

  it("does not email a reservation added by hand", async () => {
    const { mailer, sync } = setup({
      ...PAID,
      source: "manual",
      payment_method: "liquide",
      sumup_checkout_id: null,
    });

    await sync();

    expect(mailer.send).not.toHaveBeenCalled();
  });
});

describe("with the mailer disabled", () => {
  const setupDisabled = (row: Reservation) => {
    const db = createFakeDb([row]);
    const deps = createDeps({
      db,
      sumup: createFakeSumUp("PAID"),
      mailer: null,
    });
    const sync = async () =>
      syncReservation(deps, (await db.getReservation(row.id)) as Reservation);
    return { db, sync };
  };

  it("confirms and tickets the payment without claiming an email", async () => {
    const { db, sync } = setupDisabled(buildReservation());

    const current = await sync();

    expect(current).toMatchObject({ status: "paid", ticket_no: 1 });
    expect(db.claimEmail).not.toHaveBeenCalled();
    expect((await db.getReservation(RESERVATION_ID))?.email_sent_at).toBe(null);
  });

  it("flags a refund without claiming the alert", async () => {
    const { db, sync } = setupDisabled(
      buildReservation({ status: "cancelled", cancelled_at: new Date() }),
    );

    const current = await sync();

    expect(current.needs_refund).toBe(true);
    expect(db.claimEmail).not.toHaveBeenCalled();
  });
});

describe("refund alert", () => {
  it.each([
    [
      "lands after an admin cancel",
      buildReservation({ status: "cancelled", cancelled_at: new Date() }),
    ],
    [
      "found no seat left",
      buildReservation({
        status: "paid",
        needs_refund: true,
        paid_at: new Date(),
      }),
    ],
  ])(
    "alerts the organisers instead of confirming when a payment %s",
    async (_label, row) => {
      const { db, mailer, sync } = setup(row);

      await sync();
      await sync();

      expect(mailer.send).toHaveBeenCalledTimes(1);
      const [mail] = mailer.send.mock.calls[0];
      expect(mail.to).toBe(EVENT.contactEmail);
      expect(mail.subject).toContain("Camille Durand");
      expect(mail.text).toContain(RESERVATION_ID);
      expect(JSON.stringify(mail)).not.toContain("camille@mail.fr");
      expect(
        (await db.getReservation(RESERVATION_ID))?.email_sent_at,
      ).toBeInstanceOf(Date);
    },
  );
});
