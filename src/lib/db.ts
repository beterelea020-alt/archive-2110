import { Pool, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var archivePool: Pool | undefined;
}

const ssl = process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;
const isProduction = process.env.NODE_ENV === "production";
const requestedPoolMax = Number(process.env.DB_POOL_MAX ?? (isProduction ? "1" : "10"));
const poolMax = Number.isInteger(requestedPoolMax) && requestedPoolMax > 0
  ? Math.min(requestedPoolMax, 10)
  : (isProduction ? 1 : 10);
export const pool = globalThis.archivePool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  // Vercel/serverless should use a small client pool and Supabase's transaction pooler.
  max: poolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});
if (process.env.NODE_ENV !== "production") globalThis.archivePool = pool;

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL غير مضبوط في ملف البيئة.");
  return pool.query<T>(text, values);
}
