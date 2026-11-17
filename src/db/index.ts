import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as app from "./schema/app";
import * as auth from "./schema/auth";

export const schema = { ...app, ...auth };

// No console line per Postgres NOTICE ("already exists, skipping"); errors still throw
const client = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });
export const db = drizzle(client, { schema });
