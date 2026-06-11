import { PrismaClient } from "@prisma/client";

declare global {
  // Undgår multiple Prisma clients under hot-reload i development
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const db = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}
