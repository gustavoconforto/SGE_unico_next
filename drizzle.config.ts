import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Drizzle migrations own every table: change a schema file, then `npm run db:generate`.
export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/db/schema/app.ts", "./src/db/schema/auth.ts"],
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
