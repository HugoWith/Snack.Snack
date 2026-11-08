import { assertLocalTestDb } from "./guard";

assertLocalTestDb(import.meta.env.DATABASE_URL as string | undefined);
