import { afterEach, describe, expect, it, vi } from "vitest";
import { parseSmtpEnv } from "../../server/validation";

const SMTP = {
  SMTP_USER: "snack@example.test",
  SMTP_APP_PASSWORD: "app-password",
  MAIL_FROM: "Snack Snack <snack@example.test>",
};

const REQUIRED = {
  DATABASE_URL: "postgres://postgres@127.0.0.1:1/postgres",
  SUMUP_API_KEY: "sumup-key",
  SUMUP_MERCHANT_CODE: "M123",
  SUPABASE_URL: "http://127.0.0.1:55421",
  SUPABASE_ANON_KEY: "anon",
  ADMIN_EMAILS: "admin@example.test",
  SITE_URL: "http://localhost:8888",
};

const loadFunction = async (env: Record<string, string>) => {
  vi.resetModules();
  vi.stubGlobal("Netlify", { env: { get: (name: string) => env[name] } });
  return import("../../netlify/functions/api");
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseSmtpEnv", () => {
  it.each([[{}], [{ SMTP_USER: "", SMTP_APP_PASSWORD: "", MAIL_FROM: "" }]])(
    "disables the mailer when nothing is set %j",
    (env) => {
      expect(
        parseSmtpEnv((name) => (env as Record<string, string>)[name]),
      ).toBe(null);
    },
  );

  it("reads the three values when all are set", () => {
    expect(
      parseSmtpEnv((name) => (SMTP as Record<string, string>)[name]),
    ).toEqual({
      user: SMTP.SMTP_USER,
      appPassword: SMTP.SMTP_APP_PASSWORD,
      from: SMTP.MAIL_FROM,
    });
  });

  it("refuses a partial setup and names what is missing", () => {
    const env: Record<string, string> = { SMTP_USER: SMTP.SMTP_USER };

    expect(() => parseSmtpEnv((name) => env[name])).toThrow(
      "SMTP_APP_PASSWORD, MAIL_FROM",
    );
  });
});

describe("netlify function", () => {
  it("starts without any SMTP variable", async () => {
    const module = await loadFunction(REQUIRED);

    expect(typeof module.default).toBe("function");
  });

  it("refuses to load with only part of the SMTP variables", async () => {
    await expect(
      loadFunction({ ...REQUIRED, SMTP_USER: SMTP.SMTP_USER }),
    ).rejects.toThrow("SMTP_APP_PASSWORD");
  });

  it("starts with all of them", async () => {
    const module = await loadFunction({ ...REQUIRED, ...SMTP });

    expect(typeof module.default).toBe("function");
  });
});
