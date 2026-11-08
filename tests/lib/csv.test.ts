import { describe, expect, it } from "vitest";
import type { AdminRow } from "../../src/lib/admin-api";
import { toCsv } from "../../src/lib/csv";

const ROW: AdminRow = {
  id: "0b7f6a4e-3c1d-4e8a-9f2b-5d6c7e8f9a01",
  ticketNo: 7,
  fullName: "Camille Durand",
  email: "camille@mail.fr",
  covers: 2,
  vg: 1,
  status: "paid",
  source: "online",
  paymentMethod: "sumup",
  needsRefund: false,
  paidAt: "2026-11-07T12:05:00.000Z",
  createdAt: "2026-11-07T12:00:00.000Z",
};

const lines = (csv: string): string[] => csv.slice(1).split("\r\n");

describe("toCsv", () => {
  it("starts with a BOM so Excel reads UTF-8", () => {
    expect(toCsv([ROW]).charCodeAt(0)).toBe(0xfeff);
  });

  it("writes the exact French header", () => {
    expect(lines(toCsv([]))[0]).toBe(
      "Nº;Nom;Email;Couverts;Dont VG;Statut;Source;Paiement;À rembourser;Payé le",
    );
  });

  it("writes one line per row with French labels and Paris time", () => {
    expect(lines(toCsv([ROW]))[1]).toBe(
      "7;Camille Durand;camille@mail.fr;2;1;Payé;En ligne;SumUp;non;07/11/2026 13:05",
    );
  });

  it("leaves missing values empty", () => {
    const row: AdminRow = {
      ...ROW,
      ticketNo: null,
      email: null,
      status: "cancelled",
      source: "manual",
      paymentMethod: "offert",
      paidAt: null,
    };

    expect(lines(toCsv([row]))[1]).toBe(
      ";Camille Durand;;2;1;Annulé;Manuel;Offert;non;",
    );
  });

  it("flags refunds with oui", () => {
    expect(lines(toCsv([{ ...ROW, needsRefund: true }]))[1]).toContain(";oui;");
  });

  it("quotes values holding a separator, a quote or a newline", () => {
    const [, first, second, third] = lines(
      toCsv([
        { ...ROW, fullName: "Durand; Camille" },
        { ...ROW, fullName: 'Camille "Cam" Durand' },
        { ...ROW, fullName: "Camille\nDurand" },
      ]),
    );

    expect(first).toMatch(/^7;"Durand; Camille";/);
    expect(second).toMatch(/^7;"Camille ""Cam"" Durand";/);
    expect(third).toMatch(/^7;"Camille\nDurand";/);
  });

  it.each(["=", "+", "-", "@", "\t"])(
    "neutralises a formula starting with %j",
    (trigger) => {
      const [, line] = lines(toCsv([{ ...ROW, fullName: `${trigger}1+1` }]));

      expect(line.split(";")[1]).toBe(`'${trigger}1+1`);
    },
  );

  it("neutralises a formula starting with a carriage return, then quotes it", () => {
    const [, line] = lines(toCsv([{ ...ROW, fullName: "\r=1+1" }]));

    expect(line).toMatch(/^7;"'\r=1\+1";/);
  });

  it("prefixes before escaping quotes", () => {
    const [, line] = lines(toCsv([{ ...ROW, fullName: '=HYPERLINK("x")' }]));

    expect(line).toMatch(/^7;"'=HYPERLINK\(""x""\)";/);
  });

  it("checks every column, not only the name", () => {
    const [, line] = lines(toCsv([{ ...ROW, email: "+33@mail.fr" }]));

    expect(line).toContain(";'+33@mail.fr;");
  });

  it("leaves a value with a formula sign further in untouched", () => {
    const [, line] = lines(
      toCsv([{ ...ROW, fullName: "Anne-Marie Durand", email: "a=b@mail.fr" }]),
    );

    expect(line).toMatch(/^7;Anne-Marie Durand;a=b@mail\.fr;/);
  });
});
