import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, username } from "better-auth/plugins";
import { db } from "@/db";
import * as authSchema from "@/db/schema/auth";
import { ac, roles } from "@/lib/permissions";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // staff accounts are created by an admin (auth.api.createUser)
  },
  // Login attempt counts in Postgres: in memory each Vercel instance would count its own
  // Set by the employee, guardian and student forms (src/lib/login.ts), never by the client
  user: {
    additionalFields: {
      employeeId: { type: "number", required: false, input: false },
      guardianId: { type: "number", required: false, input: false },
      studentId: { type: "number", required: false, input: false },
      mustChangePassword: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  rateLimit: { storage: "database" },
  // The proxy, the layout and each action all read the session: a signed cookie spares those Postgres lookups.
  // shortcut: a revoked session or banned user keeps access for up to maxAge seconds; lower it if that matters
  session: { cookieCache: { enabled: true, maxAge: 60 } },
  plugins: [
    username(),
    admin({
      ac,
      roles,
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    nextCookies(),
  ],
});
