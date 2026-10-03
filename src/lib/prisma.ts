import { PrismaClient } from '@prisma/client';

// 接続文字列に未指定のパラメータだけを補う。
// connect_timeout は Neon のコンピュートが自動停止から復帰する（コールドスタート）間に
// 接続がタイムアウトしないよう、Prisma 既定の 5 秒より長めに取っている。
const DEFAULT_PARAMS: Record<string, string> = {
  connection_limit: '10',
  pool_timeout: '20',
  connect_timeout: '15',
};

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  const missing = Object.entries(DEFAULT_PARAMS)
    .filter(([key]) => !new RegExp(`[?&]${key}=`).test(url))
    .map(([key, value]) => `${key}=${value}`);
  if (missing.length === 0) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${missing.join('&')}`;
};

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
