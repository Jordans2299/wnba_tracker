import { defineConfig } from "drizzle-kit";

const url = process.env.TURSO_DATABASE_URL ?? "file:local.db";
const isRemote = url.startsWith("libsql://") || url.startsWith("https://");

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: isRemote ? "turso" : "sqlite",
  dbCredentials: {
    url,
    ...(isRemote ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
  },
});
