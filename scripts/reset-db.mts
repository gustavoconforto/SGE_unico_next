// Development only: drops every table, re-runs the Drizzle migrations and loads the test seed.
// Refuses any database that isn't on this machine, so it can never touch Neon.
import "dotenv/config";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
  console.error(`Refusing to reset ${url.hostname}: db:reset only runs against a local database.`);
  process.exit(1);
}

const { db } = await import("../src/db");
await db.execute(sql`drop schema if exists public cascade`);
await db.execute(sql`drop schema if exists drizzle cascade`);
await db.execute(sql`create schema public`);
await migrate(db, { migrationsFolder: "drizzle" });
console.log("Schema recreated from drizzle/.");

const { seed } = await import("./seed.mjs");
await seed();
process.exit(0);
