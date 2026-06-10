// This file gives the app one shared way to access the database.
// API routes, server components, and scripts use getDb() instead of creating
// PrismaClient repeatedly.

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

// In development, Next.js can reload server files often.
// Storing PrismaClient on globalThis avoids opening a new database connection
// every time the server reloads.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const bundledSeedDatabasePath = path.join(process.cwd(), "prisma", "seed.db");
const writableVercelDatabasePath = "/tmp/dynamic-active-demo.db";

function isSqliteDatabaseUrl(databaseUrl: string | undefined) {
  return !databaseUrl || databaseUrl.startsWith("file:");
}

function getRuntimeDatabaseUrl() {
  if (
    process.env.VERCEL !== "1" ||
    !isSqliteDatabaseUrl(process.env.DATABASE_URL)
  ) {
    return process.env.DATABASE_URL;
  }

  if (!fs.existsSync(writableVercelDatabasePath)) {
    if (!fs.existsSync(bundledSeedDatabasePath)) {
      throw new Error(
        `Bundled SQLite seed database is missing at ${bundledSeedDatabasePath}.`
      );
    }

    fs.copyFileSync(bundledSeedDatabasePath, writableVercelDatabasePath);
  }

  return `file:${writableVercelDatabasePath}`;
}

// getDb() lazily creates the Prisma client only when app code actually needs it.
export function getDb() {
  if (!globalForPrisma.prisma) {
    const databaseUrl = getRuntimeDatabaseUrl();

    globalForPrisma.prisma = new PrismaClient({
      datasources: databaseUrl
        ? {
            db: {
              url: databaseUrl,
            },
          }
        : undefined,
    });
  }

  return globalForPrisma.prisma;
}
