import type { Config } from "@netlify/functions";
import { createVerifyAdmin, parseAdminEmails } from "../../server/admin-auth";
import { createApp } from "../../server/app";
import { createDb } from "../../server/db";
import { createMailer } from "../../server/mailer";
import { createSumUp } from "../../server/sumup";
import { parsePriceOverride, parseSmtpEnv } from "../../server/validation";
import { EVENT } from "../../src/event";

const requireEnv = (name: string): string => {
  const value = Netlify.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

const smtp = parseSmtpEnv((name) => Netlify.env.get(name));

const app = createApp({
  db: createDb(requireEnv("DATABASE_URL")),
  sumup: createSumUp({
    apiKey: requireEnv("SUMUP_API_KEY"),
    merchantCode: requireEnv("SUMUP_MERCHANT_CODE"),
  }),
  mailer: smtp && createMailer(smtp),
  verifyAdmin: createVerifyAdmin({
    supabaseUrl: requireEnv("SUPABASE_URL"),
    anonKey: requireEnv("SUPABASE_ANON_KEY"),
    adminEmails: parseAdminEmails(requireEnv("ADMIN_EMAILS")),
  }),
  env: {
    siteUrl: requireEnv("SITE_URL"),
    priceCents: parsePriceOverride(
      Netlify.env.get("PRICE_CENTS_OVERRIDE"),
      EVENT.priceCents,
    ),
  },
});

export default (req: Request): Response | Promise<Response> => app.fetch(req);

export const config: Config = { path: "/api/*" };
