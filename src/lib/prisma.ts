import { PrismaClient } from '@prisma/client';

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (url.includes('connection_limit')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}connection_limit=10&pool_timeout=20`;
};

const createPrismaClient = () =>
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    // パスワードは画面へ渡るデータに含めない。必要な箇所（auth.ts）でのみ omit: { password: false } で取得する
    omit: {
      user: { password: true },
    },
  });

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof createPrismaClient> };

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
