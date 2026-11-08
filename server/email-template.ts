import { EVENT } from "../src/event";
import {
  formatCovers,
  formatEuros,
  formatTicketNo,
  padTwo,
} from "../src/lib/format";
import type { Reservation } from "./db";

export type RenderedEmail = { subject: string; html: string; text: string };

export type ConfirmationInput = {
  firstName: string;
  ticketNo: number;
  covers: number;
  vg: number;
  amountCents: number;
  ticketUrl: string;
  siteUrl: string;
};

// Email clients ignore stylesheets and web fonts unevenly: layout is tables
// with inline styles, and every web font falls back to Arial Black / Arial.
export const renderConfirmationEmail = ({
  firstName,
  ticketNo,
  covers,
  vg,
  amountCents,
  ticketUrl,
  siteUrl,
}: ConfirmationInput): RenderedEmail => {
  const subject = `Ton couvert est posé. ${formatTicketNo(ticketNo)}`;
  const greeting = `MERCI ${firstName.toUpperCase()}.`;
  const statement = [
    `${EVENT.dateLabel.toUpperCase()}.`,
    `${EVENT.lunchTime.toUpperCase()}. ${EVENT.venue.name.toUpperCase()}, ${EVENT.venue.city.toUpperCase()}.`,
  ];
  const recap = [
    { label: "Nº:", value: padTwo(ticketNo) },
    { label: "COVERS:", value: formatCovers(covers, vg) },
    { label: "PAYÉ:", value: formatEuros(amountCents) },
  ];
  const sentences = [
    "Ton billet t'attend en un clic, garde-le sur ton téléphone.",
    "Une allergie, une remarque ? Réponds simplement à ce mail.",
    `Après le déjeuner, on pousse les tables. L'after commence à ${EVENT.afterTime}, gratuit et ouvert à toustes.`,
  ];
  const photoUrl = `${siteUrl}/img/plat-os.jpg`;

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${subject}</title>
<style>
@font-face{font-family:"Nohemi";src:url(${siteUrl}/fonts/Nohemi-ExtraBold.woff2) format("woff2");font-weight:800}
@font-face{font-family:"Satoshi";src:url(${siteUrl}/fonts/Satoshi-Bold.woff2) format("woff2");font-weight:400 700}
@font-face{font-family:"Satoshi";src:url(${siteUrl}/fonts/Satoshi-Black.woff2) format("woff2");font-weight:800 900}
@media (max-width:480px){
.gutter{padding-left:24px !important;padding-right:24px !important}
.statement{font-size:28px !important}
.recap-value{font-size:20px !important}
}
</style>
</head>
<body style="margin:0;padding:0;background-color:${GROUND}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${GROUND}" style="background-color:${GROUND}">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${GROUND};color:${TEXT};font-family:${TEXT_FONT}">
<tr>
<td height="296" valign="top" background="${photoUrl}" bgcolor="${GROUND}" style="height:296px;padding:32px 40px;background-color:${GROUND};background-image:url(${photoUrl});background-image:linear-gradient(180deg, rgba(11,12,11,0.35) 0%, rgba(11,12,11,0) 40%, rgba(11,12,11,0.9) 100%), url(${photoUrl});background-size:cover;background-position:center">
<table role="presentation" width="100%" height="296" cellpadding="0" cellspacing="0" border="0" style="height:296px">
<tr><td height="16" align="center" valign="top" style="height:16px;font-family:${TEXT_FONT};font-weight:900;font-size:13px;line-height:16px;color:${LABEL}">C'EST RÉSERVÉ</td></tr>
<tr><td align="center" valign="bottom"><img src="${siteUrl}/img/snack-snack-logo-sm.png" width="180" height="98" alt="Snack Snack" style="display:block;margin:0 auto;width:180px;height:auto;border:0"></td></tr>
</table>
</td>
</tr>
<tr>
<td class="gutter" style="padding:72px 56px 0">
<h1 class="statement" style="margin:0;font-family:${DISPLAY_FONT};font-weight:800;font-size:34px;line-height:1;letter-spacing:-0.055em;color:${MUSTARD}">${escapeHtml(greeting)}<br>${statement.join("<br>")}</h1>
<p style="margin:24px 0 0;font-size:16px;line-height:24px;font-weight:700;color:${TEXT}">${EVENT.venue.address}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAPER}" style="margin-top:56px;background-color:${PAPER}">
<tr>
${recap.map(recapCell).join("\n")}
</tr>
</table>
${sentences
  .map(
    (sentence, index) =>
      `<p style="margin:${index === 0 ? "56px" : "18px"} 0 0;font-size:16px;line-height:24px;font-weight:500;color:${LABEL}">${sentence}</p>`,
  )
  .join("\n")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:56px">
<tr><td align="center" bgcolor="${MUSTARD}" style="background-color:${MUSTARD}">
<a href="${ticketUrl}" style="display:block;padding:18px 24px;font-family:${DISPLAY_FONT};font-weight:800;font-size:20px;line-height:24px;letter-spacing:-0.05em;color:${INK};text-decoration:none">VOIR MON BILLET</a>
</td></tr>
</table>
</td>
</tr>
<tr>
<td class="gutter" align="center" style="padding:96px 56px 40px;font-family:${TEXT_FONT};font-weight:900;font-size:13px;line-height:16px;color:${LABEL}">BISOU BISOU</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    greeting,
    ...statement,
    EVENT.venue.address,
    "",
    recap.map(({ label, value }) => `${label} ${value}`).join("  ·  "),
    "",
    sentences[0],
    `VOIR MON BILLET : ${ticketUrl}`,
    "",
    ...sentences.slice(1),
    "",
    "BISOU BISOU",
  ].join("\n");

  return { subject, html, text };
};

export const renderRefundAlert = (reservation: Reservation): RenderedEmail => {
  const reason =
    reservation.status === "cancelled"
      ? "La réservation avait été annulée avant que le paiement arrive."
      : "Il ne restait plus de place quand le paiement est arrivé.";
  const lines = [
    `Un paiement SumUp est à rembourser. ${reason}`,
    "",
    `Nom : ${reservation.full_name}`,
    `Couverts : ${formatCovers(reservation.covers, reservation.vg)}`,
    `Montant : ${formatEuros(reservation.amount_cents)}`,
    `Réservation : ${reservation.id}`,
    `Checkout SumUp : ${reservation.sumup_checkout_id ?? "-"}`,
  ];

  return {
    subject: `À rembourser : ${reservation.full_name}`,
    html: lines
      .filter((line) => line !== "")
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join("\n"),
    text: lines.join("\n"),
  };
};

const recapCell = (
  { label, value }: { label: string; value: string },
  index: number,
  cells: unknown[],
): string =>
  `<td width="33%" valign="top" style="padding:24px ${index === cells.length - 1 ? 28 : 8}px 24px ${index === 0 ? 28 : 8}px">
<div style="font-family:${TEXT_FONT};font-size:11px;line-height:14px;font-weight:700;letter-spacing:0.06em;color:${TICKET_INK}">${label}</div>
<div class="recap-value" style="padding-top:4px;font-family:${DISPLAY_FONT};font-weight:800;font-size:24px;line-height:28px;letter-spacing:-0.05em;color:${TICKET_VALUE}">${value}</div>
</td>`;

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Mirrors design/tokens.css: email clients cannot read CSS variables.
const GROUND = "#0b0c0b";
const INK = "#000000";
const LABEL = "#bab7b7";
const TEXT = "#f2f0ec";
const MUSTARD = "#ffbd00";
const PAPER = "#e9e4da";
const TICKET_INK = "#5e5560";
const TICKET_VALUE = "#1d1b22";
const DISPLAY_FONT = "'Nohemi', 'Arial Black', Arial, sans-serif";
const TEXT_FONT = "'Satoshi', Arial, Helvetica, sans-serif";
