// Empties a remote database (Neon, while in beta): drops every schema, recreates public, re-runs the migrations.
// No seed. Asks you to type the host first, since every row (users included) is lost.
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const host = new URL(process.env.DATABASE_URL ?? "").hostname;
if (host.includes("-pooler")) {
  console.error(`${host} is Neon's pooled URL: run db:wipe with the direct one.`);
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question(`This deletes ALL data on ${host}. Type the host to confirm: `);
rl.close();
if (answer.trim() !== host) {
  console.error("Host didn't match: nothing was changed.");
  process.exit(1);
}

const { db } = await import("../src/db");
await db.execute(sql`drop schema if exists public cascade`);
await db.execute(sql`drop schema if exists drizzle cascade`);
await db.execute(sql`create schema public`);
await migrate(db, { migrationsFolder: "drizzle" });
console.log("Schema recreated from drizzle/. No users exist now: run `npm run create-admin` next.");
process.exit(0);
