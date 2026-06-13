// This file gives the app one shared way to access the database.
// API routes, server components, and scripts use getDb() instead of creating
// PrismaClient repeatedly.

import { PrismaClient } from "@prisma/client";

// In development, Next.js can reload server files often.
// Storing PrismaClient on globalThis avoids opening a new database connection
// every time the server reloads.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// getDb() lazily creates the Prisma client only when app code actually needs it.
export function getDb() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }

  return globalForPrisma.prisma;
}
