// Runs before dev, db:reset and db:migrate: starts the local Postgres container when DATABASE_URL is local.
// Against Neon (or anywhere else) it does nothing, so db:migrate still works where there is no Docker.
import "dotenv/config";
import { execFileSync } from "node:child_process";

const { hostname } = new URL(process.env.DATABASE_URL ?? "postgres://localhost");
if (["localhost", "127.0.0.1", "[::1]"].includes(hostname)) {
  execFileSync("docker", ["start", "gestao-pg"], { stdio: ["ignore", "ignore", "inherit"] });
  // A just-started container needs a moment before it accepts connections
  for (let i = 0; ; i++) {
    try {
      execFileSync("docker", ["exec", "gestao-pg", "pg_isready", "-q"]);
      break;
    } catch (error) {
      if (i === 30) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}
