import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && isDockerRuntime() && isLocalhostDatabaseUrl(databaseUrl)) {
  const rewritten = replaceDatabaseHost(databaseUrl, "db");
  if (rewritten) {
    process.env.DATABASE_URL = rewritten;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function isDockerRuntime() {
  return (
    process.env.DOCKER === "true" ||
    process.env.DOCKER === "1" ||
    existsSync("/.dockerenv")
  );
}

function isLocalhostDatabaseUrl(databaseUrl: string) {
  try {
    const parsed = new URL(databaseUrl);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function replaceDatabaseHost(databaseUrl: string, host: string) {
  try {
    const parsed = new URL(databaseUrl);
    parsed.hostname = host;
    return parsed.toString();
  } catch {
    return null;
  }
}
