import postgres from "postgres";

const LOCAL_HOSTS = ["127.0.0.1", "localhost"];
// Postgres direct, then the local Supavisor pooler (transaction mode).
const LOCAL_PORTS = [55422, 55429];
const EXPECTED = `${LOCAL_PORTS.map((port) => `127.0.0.1:${port}`).join(" or ")} (local Supabase, see supabase/config.toml)`;

// The db tests truncate reservations, and a DATABASE_URL in the shell
// overrides .env: refuse anything but the local stack.
export const assertLocalTestDb = (url: string | undefined): void => {
  const target = describeTarget(url);
  if (target === "ok") return;
  throw new Error(
    `Refusing to run the db tests: DATABASE_URL ${target}, expected ${EXPECTED}. ` +
      `They truncate the reservations table.`,
  );
};

// Checks where postgres.js will actually connect: its query parameters
// (?host=, ?port=) override the host and port of the URL itself.
const describeTarget = (url: string | undefined): string => {
  if (!url) return "is not set";
  if (!URL.canParse(url)) return "is not a valid URL";
  const { host, port, path } = resolveTarget(url);
  if (path) return "points at a Unix socket";
  if (
    host.every((name) => LOCAL_HOSTS.includes(name)) &&
    port.every((number) => LOCAL_PORTS.includes(number))
  )
    return "ok";
  return `points at ${host.map((name, index) => `${name}:${port[index] ?? port[0]}`).join(", ")}`;
};

// Building the client opens no connection; end() drops it right away.
const resolveTarget = (
  url: string,
): { host: string[]; port: number[]; path: string | false } => {
  const sql = postgres(url);
  const { host, port, path } = sql.options;
  void sql.end();
  return { host, port, path };
};
