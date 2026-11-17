// Applies the pending migrations in drizzle/ (dev or Neon). Unlike `drizzle-kit migrate`, a failure prints its error.
import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const { db } = await import("../src/db");
console.log(`Migrating ${new URL(process.env.DATABASE_URL ?? "").hostname}…`);
await migrate(db, { migrationsFolder: "drizzle" });
console.log("Migrations applied.");
process.exit(0);
