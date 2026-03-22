import { PrismaClient } from "@prisma/client";
import { existsSync, statSync } from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  /** Dev: mtime of generated client when we constructed PrismaClient */
  prismaClientMtimeMs?: string;
};

const log =
  process.env.NODE_ENV === "development" ? (["error", "warn"] as const) : (["error"] as const);

function generatedClientMtime(): string {
  try {
    const p = path.join(process.cwd(), "node_modules", ".prisma", "client", "index.js");
    if (!existsSync(p)) return "0";
    return String(statSync(p).mtimeMs);
  } catch {
    return "0";
  }
}

function createPrisma(): PrismaClient {
  return new PrismaClient({ log: [...log] });
}

/**
 * In development, reuse a global PrismaClient for connection pooling, but replace it when
 * `npx prisma generate` updates `node_modules/.prisma/client` (mtime changes). Otherwise you get
 * `Unknown argument '…'` until you manually restart `next dev` (stale client on `globalThis`).
 */
function getPrisma(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrisma();
      globalForPrisma.prismaClientMtimeMs = generatedClientMtime();
    }
    return globalForPrisma.prisma;
  }

  const mtime = generatedClientMtime();
  if (!globalForPrisma.prisma || globalForPrisma.prismaClientMtimeMs !== mtime) {
    void globalForPrisma.prisma?.$disconnect().catch(() => {});
    globalForPrisma.prisma = createPrisma();
    globalForPrisma.prismaClientMtimeMs = mtime;
  }

  return globalForPrisma.prisma;
}

/** Typed proxy so `prisma.kit.update` etc. stay typed and pick up regenerated client in dev. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    return Reflect.get(client, prop, receiver);
  },
}) as PrismaClient;
