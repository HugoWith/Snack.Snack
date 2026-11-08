import { describe, expect, it } from "vitest";
import { assertLocalTestDb } from "./guard";

describe("assertLocalTestDb", () => {
  it.each([
    "postgresql://postgres:postgres@127.0.0.1:55422/postgres",
    "postgres://postgres:postgres@localhost:55422/postgres",
    "postgresql://postgres.pooler-dev:postgres@127.0.0.1:55429/postgres",
    "postgres://postgres.pooler-dev:postgres@localhost:55429/postgres",
  ])("accepts the local test database %s", (url) => {
    expect(() => assertLocalTestDb(url)).not.toThrow();
  });

  it.each([
    undefined,
    "",
    "not a url",
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    "postgresql://postgres:postgres@127.0.0.1/postgres",
    "postgresql://postgres.abc:secret@aws-0-eu-west-3.pooler.supabase.com:6543/postgres",
    "postgresql://postgres:secret@db.abc.supabase.co:55422/postgres",
    "postgresql://postgres.abc:secret@aws-0-eu-west-2.pooler.supabase.com:55429/postgres",
    "postgresql://postgres:postgres@127.0.0.1:55428/postgres",
    "postgresql://postgres:postgres@127.0.0.1:55422/postgres?host=db.abc.supabase.co",
    "postgresql://postgres:postgres@127.0.0.1:55422/postgres?host=/tmp",
    "postgresql://postgres:postgres@127.0.0.1:55422/postgres?port=54322",
    "postgresql://postgres:postgres@127.0.0.1:55422,db.abc.supabase.co:5432/postgres",
    "postgresql://postgres:postgres@127.0.0.1:55429,db.abc.supabase.co:55429/postgres",
  ])("refuses %j", (url) => {
    expect(() => assertLocalTestDb(url)).toThrow("127.0.0.1:55422");
  });

  it("never echoes the connection string", () => {
    const attempt = () =>
      assertLocalTestDb("postgresql://postgres:s3cret@example.com:5432/db");

    expect(attempt).toThrow("example.com:5432");
    expect(attempt).not.toThrow("s3cret");
  });
});
