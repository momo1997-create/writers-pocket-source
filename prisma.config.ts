import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set for Prisma");
}

export default defineConfig({
  schema: "prisma/schema.prisma",

  // 🔴 MUST be singular
  datasource: {
    url: connectionString, // required for db push
    adapter: new PrismaPg(
      new pg.Pool({
        connectionString,
      })
    ),
  },
});